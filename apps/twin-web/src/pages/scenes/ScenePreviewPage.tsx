import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ScenePreviewCanvas } from '@/components/scene/ScenePreviewCanvas'
import type { SceneFile, SceneLibraryItem } from '@/schemas/scene'
import { loadEquipmentCatalog, type CatalogAsset } from '@/services/loadEquipmentCatalog'
import { fetchNamedScene, listNamedScenes } from '@/services/loadDemoScene'

function emptyScene(): SceneFile {
  return { version: 1, devices: [], portGroups: [], pipes: [] }
}

export function ScenePreviewPage() {
  const { sceneId } = useParams<{ sceneId: string }>()
  const [scene, setScene] = useState<SceneFile>(emptyScene)
  const [sceneMeta, setSceneMeta] = useState<SceneLibraryItem | null>(null)
  const [catalog, setCatalog] = useState<CatalogAsset[]>([])
  const [flowEnabled, setFlowEnabled] = useState(false)
  const [loading, setLoading] = useState(Boolean(sceneId))
  const [error, setError] = useState<string | null>(null)
  const pageError = error ?? (!sceneId ? '缺少场景标识，无法打开预览。' : null)

  useEffect(() => {
    if (!sceneId) return
    let cancelled = false

    void Promise.all([fetchNamedScene(sceneId), loadEquipmentCatalog(), listNamedScenes()])
      .then(([sceneResult, catalogResult, listResult]) => {
        if (cancelled) return
        if (!sceneResult.ok) {
          setError(sceneResult.error)
          setLoading(false)
          return
        }
        if (!listResult.ok) {
          setError(listResult.error)
          setLoading(false)
          return
        }
        setScene(sceneResult.data)
        setSceneMeta(listResult.data.items.find((item) => item.id === sceneId) ?? null)
        setCatalog(catalogResult)
        setError(null)
        setLoading(false)
      })
      .catch((loadError) => {
        if (cancelled) return
        setError(loadError instanceof Error ? loadError.message : String(loadError))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sceneId])

  const modelUrlByAssetId = useMemo(
    () => Object.fromEntries(catalog.map((asset) => [asset.assetId, asset.modelGlbUrl ?? null])),
    [catalog],
  )
  const renderStyleByAssetId = useMemo(
    () => Object.fromEntries(catalog.map((asset) => [asset.assetId, asset.renderStyle])),
    [catalog],
  )

  return (
    <div className="scene-preview-page">
      <header className="scene-preview-topbar">
        <div>
          <p className="scene-preview-eyebrow">只读预览</p>
          <h1>{sceneMeta?.name ?? '场景效果预览'}</h1>
          <p className="muted small">
            {sceneMeta ? `最近更新：${new Date(sceneMeta.updatedAt).toLocaleString()}` : <>当前场景：<code>{sceneId ?? 'unknown-scene'}</code></>}
          </p>
        </div>
        <div className="scenes-actions">
          <Link className="secondary scene-link-button" to="/scenes">
            返回场景管理
          </Link>
          <Link className="secondary scene-link-button" to={sceneId ? `/editor?sceneId=${encodeURIComponent(sceneId)}` : '/editor'}>
            进入编辑
          </Link>
        </div>
      </header>

      <section className="scene-preview-layout">
        <aside className="scene-preview-side">
          <section className="scenes-card scenes-card--hero">
            <h2>预览控制</h2>
            <p className="muted small">此页面仅用于查看设备组合效果，可操作视角并开启流动状态，不可直接编辑。</p>
            <label className="scene-preview-toggle">
              <input
                type="checkbox"
                aria-label="预览流动状态"
                checked={flowEnabled}
                onChange={(event) => setFlowEnabled(event.target.checked)}
              />
              <span>预览流动状态</span>
            </label>
          </section>

          <section className="scenes-card">
            <h2>场景概览</h2>
            <p className="scenes-summary-remark">{sceneMeta?.remark || '暂无备注'}</p>
            <div className="scenes-preview-grid">
              <article className="scenes-preview-stat">
                <span className="toolbar-hint">设备数</span>
                <strong>{sceneMeta?.deviceCount ?? scene.devices.length}</strong>
              </article>
              <article className="scenes-preview-stat">
                <span className="toolbar-hint">管线数</span>
                <strong>{sceneMeta?.pipeCount ?? scene.pipes.length}</strong>
              </article>
            </div>
          </section>

          {pageError ? (
            <section className="scenes-card scenes-card--error">
              <p>{pageError}</p>
            </section>
          ) : null}
        </aside>

        <main className="scene-preview-stage">
          {loading ? <p className="toolbar-hint">正在加载预览场景…</p> : null}
          {!loading ? (
            <div className="scene-preview-canvas-shell">
              <ScenePreviewCanvas
                scene={scene}
                modelUrlByAssetId={modelUrlByAssetId}
                renderStyleByAssetId={renderStyleByAssetId}
                flowEnabled={flowEnabled}
              />
            </div>
          ) : null}
        </main>
      </section>
    </div>
  )
}
