import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { SceneSubspaceShell } from '@/components/layout/SceneSubspaceShell'
import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
import { ScenePreviewCanvas } from '@/components/scene/ScenePreviewCanvas'
import type { SceneFile, SceneLibraryItem } from '@/schemas/scene'
import { loadEquipmentCatalog, type CatalogAsset } from '@/services/loadEquipmentCatalog'
import { fetchNamedScene, listNamedScenes } from '@/services/loadDemoScene'

function emptyScene(): SceneFile {
  return { version: 1, devices: [], portGroups: [], pipes: [] }
}

export function ScenePreviewPage() {
  const { sceneId } = useParams<{ sceneId: string }>()
  const [resetViewNonce, setResetViewNonce] = useState(0)
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
    <SceneSubspaceShell
      className="scene-preview-page"
      header={
        <SceneWorkspaceHeader
          eyebrow="效果预览"
          title={sceneMeta?.name ?? '场景效果预览'}
          description="只读查看场景布局和空间气质，可操作视角并预览流动状态。"
          actions={
            <>
              <Link className="secondary scene-link-button" to="/scenes">
                返回场景工作台
              </Link>
              <Link className="secondary scene-link-button" to={sceneId ? `/editor?sceneId=${encodeURIComponent(sceneId)}` : '/editor'}>
                进入编辑
              </Link>
              <button type="button" className="secondary" onClick={() => setResetViewNonce((value) => value + 1)}>
                重置视角
              </button>
            </>
          }
        />
      }
      sidebar={
        <>
          <section className="scene-summary-card">
            <h2>场景摘要</h2>
            <p className="scenes-summary-remark">{sceneMeta?.remark || '暂无备注'}</p>
            <p className="toolbar-hint">
              {sceneMeta ? `最近更新：${new Date(sceneMeta.updatedAt).toLocaleString()}` : <>当前场景：<code>{sceneId ?? 'unknown-scene'}</code></>}
            </p>
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

          <section className="scene-summary-card">
            <h2>预览控制</h2>
            <p className="muted small">开启流动状态后，可以更接近运行态观察整体效果。</p>
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

          {pageError ? (
            <section className="scene-summary-card scene-summary-card--error">
              <p>{pageError}</p>
            </section>
          ) : null}
        </>
      }
      stage={
        <>
          {loading ? <p className="toolbar-hint">正在加载预览场景…</p> : null}
          {!loading ? (
            <div className="scene-preview-canvas-shell scene-preview-canvas-shell--full">
              <ScenePreviewCanvas
              scene={scene}
              modelUrlByAssetId={modelUrlByAssetId}
              renderStyleByAssetId={renderStyleByAssetId}
              flowEnabled={flowEnabled}
              resetViewNonce={resetViewNonce}
            />
          </div>
        ) : null}
        </>
      }
      sidebarClassName="scene-subspace__sidebar--summary"
      stageClassName="scene-subspace__stage--preview"
    />
  )
}
