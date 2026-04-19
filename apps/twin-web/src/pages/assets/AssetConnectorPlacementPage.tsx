import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AssetConnectorWorkbench } from '@/components/assets/AssetConnectorWorkbench'
import { getAssetPreviewModelUrl } from '@/components/assets/assetModelPreview'
import type { AssetConnector } from '@/schemas/assets'
import { getAssetDetail, replaceAssetPorts } from '@/services/api/assetsApi'

function portsToFallbackConnectors(detail: Awaited<ReturnType<typeof getAssetDetail>>): AssetConnector[] {
  return detail.ports.map((port, index) => ({
    id: port.id,
    connectorKey: port.portKey,
    portKey: port.portKey,
    name: port.name,
    system: port.system,
    role: 'generic',
    medium: null,
    direction: port.direction,
    side: null,
    groupKey: null,
    required: false,
    sortOrder: index,
    geometry: {
      anchor: port.position,
      normal: null,
    },
  }))
}

export function AssetConnectorPlacementPage() {
  const { assetId } = useParams<{ assetId: string }>()
  const [assetName, setAssetName] = useState('')
  const [assetKey, setAssetKey] = useState('')
  const [renderStyle, setRenderStyle] = useState<'box' | 'icosahedron' | 'dodecahedron' | 'octahedron'>('box')
  const [boundsHalfExtents, setBoundsHalfExtents] = useState<[number, number, number]>([1, 1, 1])
  const [connectors, setConnectors] = useState<AssetConnector[]>([])
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previewModelUrl = useMemo(() => getAssetPreviewModelUrl(assetKey, modelUrl), [assetKey, modelUrl])

  useEffect(() => {
    if (!assetId) {
      setError('缺少资产 ID')
      setLoading(false)
      return
    }

    setLoading(true)
    void getAssetDetail(assetId)
      .then((detail) => {
        setAssetName(detail.asset.displayName)
        setAssetKey(detail.asset.assetKey)
        setRenderStyle(detail.asset.renderStyle)
        setBoundsHalfExtents(detail.asset.bounds.halfExtents)
        setConnectors(detail.connectors.length > 0 ? detail.connectors : portsToFallbackConnectors(detail))
        setModelUrl(detail.asset.modelUrl)
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [assetId])

  const handleSave = async () => {
    if (!assetId) return
    setSaving(true)
    try {
      const result = await replaceAssetPorts(
        assetId,
        connectors.map((connector) => ({
          portKey: connector.portKey,
          name: connector.name,
          position: connector.geometry.anchor,
          system: connector.system,
          direction: connector.direction,
          role: connector.role,
          medium: connector.medium,
          side: connector.side,
          groupKey: connector.groupKey,
          required: connector.required,
          normal: connector.geometry.normal ?? null,
        })),
      )
      setConnectors(result.connectors)
      setMessage(`已保存 ${result.connectors.length} 个连接点`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="assets-panel">
        <p>正在加载端点定位数据…</p>
      </section>
    )
  }

  return (
    <div className="assets-placement-page">
      <section className="assets-panel assets-placement-page__header">
        <div>
          <h1>端点定位</h1>
          <p className="muted small">{assetName ? `${assetName} · ${assetKey}` : '未加载资产信息'}</p>
        </div>
        <div className="assets-inline-actions">
          <Link className="secondary" to="/assets">
            返回资产页
          </Link>
          <button type="button" className="primary" onClick={handleSave} disabled={saving || connectors.length === 0}>
            保存连接点
          </button>
        </div>
      </section>

      <AssetConnectorWorkbench
        connectors={connectors}
        boundsHalfExtents={boundsHalfExtents}
        disabled={saving}
        modelUrl={previewModelUrl}
        renderStyle={renderStyle}
        workflowMode="existing"
        onChange={setConnectors}
        onSave={handleSave}
      />

      {message ? <section className="assets-panel assets-panel--notice"><p>{message}</p></section> : null}
      {error ? <section className="assets-panel assets-panel--error"><p>{`加载失败：${error}`}</p></section> : null}
    </div>
  )
}
