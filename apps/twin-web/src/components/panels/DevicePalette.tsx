import { useRef, useState, type ChangeEvent } from 'react'
import { useSceneStore } from '@/store/sceneStore'
import {
  assetJsonSchema,
  catalogSchema,
  loadEquipmentAssetsByIds,
  portsFileSchema,
  type CatalogAsset,
  type RenderStyle,
} from '@/services/loadEquipmentCatalog'

type Props = {
  catalog: CatalogAsset[] | null
  loadError: string | null
  pendingPlacement: CatalogAsset | null
  onSetPendingPlacement: (asset: CatalogAsset | null) => void
  onImportAssets: (assets: CatalogAsset[]) => void
}

export function DevicePalette({
  catalog,
  loadError,
  pendingPlacement,
  onSetPendingPlacement,
  onImportAssets,
}: Props) {
  const addDeviceFromAsset = useSceneStore((s) => s.addDeviceFromAsset)

  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const catalogInputRef = useRef<HTMLInputElement>(null)
  const packInputRef = useRef<HTMLInputElement>(null)

  const parseAssetPackFromFiles = async (files: File[]) => {
    // 结构约定（你已确认“2”：根目录下多个子文件夹，每个子文件夹是一台设备模板）
    // 例如：MyPack/aircon_ico_v1/asset.json
    //        MyPack/aircon_ico_v1/ports.json
    //        MyPack/aircon_ico_v1/model.glb (可选)
    type WithWebkitRelativePath = File & { webkitRelativePath?: string }
    const byAssetId: Record<string, { assetFile?: File; portsFile?: File; glbFile?: File }> = {}

    for (const f of files) {
      const rel = (f as WithWebkitRelativePath).webkitRelativePath
      const parts = rel ? rel.split('/') : []
      // 至少：根目录/子目录/文件名
      if (parts.length < 3) continue
      const assetFolder = parts[1]
      const fileName = parts[parts.length - 1]
      byAssetId[assetFolder] ??= {}
      if (fileName === 'asset.json') byAssetId[assetFolder]!.assetFile = f
      else if (fileName === 'ports.json') byAssetId[assetFolder]!.portsFile = f
      else if (fileName === 'model.glb') byAssetId[assetFolder]!.glbFile = f
    }

    const assets: CatalogAsset[] = []
    for (const [assetFolder, pack] of Object.entries(byAssetId)) {
      if (!pack.assetFile || !pack.portsFile) continue
      const assetText = await pack.assetFile.text()
      const portsText = await pack.portsFile.text()
      let aJson: unknown
      let pJson: unknown
      try {
        aJson = JSON.parse(assetText) as unknown
        pJson = JSON.parse(portsText) as unknown
      } catch {
        throw new Error(`资产包解析失败：${assetFolder}（JSON 格式不合法）`)
      }
      const a = assetJsonSchema.parse(aJson)
      const p = portsFileSchema.parse(pJson)
      const renderStyle: RenderStyle = a.renderStyle ?? 'box'
      const modelUrl = pack.glbFile ? URL.createObjectURL(pack.glbFile) : null
      const modelGlb = !!modelUrl

      // 优先使用 asset.json 内的 assetId（而不是文件夹名）
      assets.push({
        assetVersion: a.assetVersion,
        assetId: a.assetId,
        displayName: a.displayName,
        type: a.type,
        defaultSystem: a.defaultSystem,
        halfExtents: a.bounds.halfExtents,
        modelGlb,
        modelGlbUrl: modelGlb ? modelUrl : null,
        renderStyle,
        portsTemplate: p.ports.map((x) => ({
          id: x.id,
          name: x.name,
          position: x.position,
          system: x.system,
          direction: x.direction,
        })),
      })
    }

    return assets
  }

  const importCatalogJson = async (text: string) => {
    setImportError(null)
    const parsed = catalogSchema.parse(JSON.parse(text) as unknown)
    const assets = await loadEquipmentAssetsByIds(parsed.assets)
    onImportAssets(assets)
  }

  const onPickCatalogJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setImporting(true)
    try {
      const text = await f.text()
      await importCatalogJson(text)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  const onPickAssetPack = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (list.length === 0) return
    setImporting(true)
    try {
      const assets = await parseAssetPackFromFiles(list)
      onImportAssets(assets)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  return (
    <aside className="panel palette">
      <h2>设备库</h2>
      <div className="palette-import">
        <div className="palette-import-row">
          <button
            type="button"
            className="secondary small-btn"
            onClick={() => catalogInputRef.current?.click()}
            disabled={importing}
          >
            导入 catalog.json
          </button>
          <input
            ref={catalogInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onPickCatalogJson}
          />
          <button
            type="button"
            className="secondary small-btn"
            onClick={() => packInputRef.current?.click()}
            disabled={importing}
          >
            导入资产包（文件夹）
          </button>
          <input
            ref={packInputRef}
            type="file"
            accept=".json,.glb,.gltf,application/json"
            hidden
            multiple
            // @ts-expect-error webkitdirectory 仅在部分浏览器内生效
            webkitdirectory="true"
            onChange={onPickAssetPack}
          />
        </div>
        {importing ? <p className="muted small">导入中…</p> : null}
        {importError ? <p className="error small">{importError}</p> : null}
      </div>
      {pendingPlacement ? (
        <div className="palette-placement-banner">
          <p className="small">
            已选：<strong>{pendingPlacement.displayName}</strong>
          </p>
          <p className="muted small">在画布<strong>地面</strong>上点击以放置；或取消后改用手动加入。</p>
          <button type="button" className="secondary" onClick={() => onSetPendingPlacement(null)}>
            取消地面放置
          </button>
        </div>
      ) : null}
      {loadError ? <p className="error">{loadError}</p> : null}
      {!catalog && !loadError ? <p className="muted">加载中…</p> : null}
      <ul className="palette-list">
        {catalog?.map((a) => (
          <li key={a.assetId} className="palette-row">
            <div className="palette-row-info">
              <span className="palette-title">{a.displayName}</span>
              <span className="palette-meta">
                {a.assetId} · {a.defaultSystem}
              </span>
            </div>
            <div className="palette-row-actions">
              <button
                type="button"
                className="secondary small-btn"
                title="在原点附近加入一台"
                onClick={() => {
                  onSetPendingPlacement(null)
                  addDeviceFromAsset(a)
                }}
              >
                加入
              </button>
              <button
                type="button"
                className={pendingPlacement?.assetId === a.assetId ? 'primary small-btn' : 'secondary small-btn'}
                title="先选中，再在地面点击放置"
                onClick={() => onSetPendingPlacement(pendingPlacement?.assetId === a.assetId ? null : a)}
              >
                地面放置
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
