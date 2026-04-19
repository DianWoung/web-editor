import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SceneSubspaceShell } from '@/components/layout/SceneSubspaceShell'
import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
import { ViewerCanvas } from '@/components/scene/ViewerCanvas'
import { loadEquipmentCatalog, type RenderStyle } from '@/services/loadEquipmentCatalog'
import { listNamedScenes, loadCurrentSceneIntoStore, loadNamedSceneIntoStore } from '@/services/loadDemoScene'
import type { SceneLibraryItem } from '@/schemas/scene'
import { useEditorUiStore } from '@/store/editorUiStore'
import { useSceneStore } from '@/store/sceneStore'
import { useRuntimeStore } from '@/store/runtimeStore'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import { useSyncRuntimeWithScene } from '@/hooks/useSyncRuntimeWithScene'

export function OverviewPage() {
  const { sceneId } = useParams<{ sceneId: string }>()
  useSyncRuntimeWithScene()
  const [resetViewNonce, setResetViewNonce] = useState(0)
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [sceneMeta, setSceneMeta] = useState<SceneLibraryItem | null>(null)
  const flowEnabled = useEditorUiStore((s) => s.flowEnabled)
  const setFlowEnabled = useEditorUiStore((s) => s.setFlowEnabled)
  const deviceCount = useSceneStore((s) => s.devices.length)
  const totalPower = useRuntimeStore((s) => s.totalPower)
  const avgCop = useRuntimeStore((s) => s.avgCop)
  const activeAlarmCount = useRuntimeStore((s) => s.activeAlarmCount)
  const lastUpdatedAt = useRuntimeStore((s) => s.lastUpdatedAt)
  const loadingOverview = useRuntimeStore((s) => s.loadingOverview)
  const overviewError = useRuntimeStore((s) => s.overviewError)
  const fetchOverview = useRuntimeStore((s) => s.fetchOverview)

  useEffect(() => {
    let c = true
    loadEquipmentCatalog()
      .then((x) => {
        if (c) {
          setCatalog(x)
          setCatalogError(null)
        }
      })
      .catch((error) => {
        if (c) {
          setCatalog([])
          setCatalogError(error instanceof Error ? error.message : String(error))
        }
      })
    return () => {
      c = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!sceneId && useSceneStore.getState().devices.length > 0) return
    const loader = sceneId ? loadNamedSceneIntoStore(sceneId) : loadCurrentSceneIntoStore()
    void loader.then((result) => {
      if (!active) return
      setSceneError(result.ok ? null : result.error)
    })
    return () => {
      active = false
    }
  }, [sceneId])

  useEffect(() => {
    let active = true
    if (!sceneId) return
    void listNamedScenes().then((result) => {
      if (!active) return
      if (!result.ok) {
        setSceneMeta(null)
        return
      }
      setSceneMeta(result.data.items.find((item) => item.id === sceneId) ?? null)
    })
    return () => {
      active = false
    }
  }, [sceneId])

  const currentSceneMeta = sceneId && sceneMeta?.id === sceneId ? sceneMeta : null

  useRuntimePolling(async () => {
    await fetchOverview()
  }, 10_000, deviceCount > 0)

  const modelUrlByAssetId = useMemo(() => {
    const m: Record<string, string | null | undefined> = {}
    catalog?.forEach((a) => {
      m[a.assetId] = a.modelGlbUrl ?? (a.modelGlb ? `/equipment/${a.assetId}/model.glb` : null)
    })
    return m
  }, [catalog])

  const renderStyleByAssetId = useMemo(() => {
    const m: Record<string, RenderStyle | undefined> = {}
    catalog?.forEach((a) => {
      m[a.assetId] = a.renderStyle ?? 'box'
    })
    return m
  }, [catalog])

  return (
    <SceneSubspaceShell
      className="overview-page"
      bodyClassName="scene-subspace__body--top"
      header={
        <SceneWorkspaceHeader
          eyebrow="当前场景运行态"
          title={currentSceneMeta?.name ?? '运行态总览'}
          description={currentSceneMeta?.remark || '围绕当前场景承接运行摘要、业务指标与设备详情跳转。'}
          actions={
            <>
              <Link className="secondary scene-link-button" to="/scenes">
                返回场景工作台
              </Link>
              {sceneId ? (
                <Link className="secondary scene-link-button" to={`/editor?sceneId=${encodeURIComponent(sceneId)}`}>
                  返回编辑
                </Link>
              ) : null}
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
            <h2>状态摘要</h2>
            <div className="scenes-runtime-grid">
              <article className="scenes-runtime-metric">
                <span className="scenes-runtime-metric__label">在线设备</span>
                <strong>{deviceCount}</strong>
              </article>
              <article className="scenes-runtime-metric">
                <span className="scenes-runtime-metric__label">活动告警</span>
                <strong>{activeAlarmCount}</strong>
              </article>
              <article className="scenes-runtime-metric">
                <span className="scenes-runtime-metric__label">总功率</span>
                <strong>{totalPower.toFixed(1)} kW</strong>
              </article>
              <article className="scenes-runtime-metric">
                <span className="scenes-runtime-metric__label">业务指标</span>
                <strong>{avgCop.toFixed(2)}</strong>
              </article>
            </div>
            <p className="muted small">运行态更新时间：{lastUpdatedAt ?? '—'}</p>
            {loadingOverview ? <p className="muted small">运行态加载中…</p> : null}
          </section>
          <section className="scene-summary-card">
            <h2>运行控制</h2>
            <label className="scene-preview-toggle">
              <input
                type="checkbox"
                checked={flowEnabled}
                onChange={(e) => setFlowEnabled(e.target.checked)}
                aria-label="管道流动模式"
              />
              <span>流动模式</span>
            </label>
            <p className="muted small">开启后，直管段会显示流动虚线效果，后续可承接真实流向与实时工况。</p>
          </section>
          <section className="scene-summary-card">
            <h2>运行建议</h2>
            <p className="muted small">
              预测午后峰值负荷略升，建议提前 30min 微调供水温度带并检查泵组组合；请以现场策略版本为准。
            </p>
          </section>
          {catalogError ? (
            <section className="scene-summary-card scene-summary-card--error">
              <p>{catalogError}</p>
            </section>
          ) : null}
          {sceneError ? (
            <section className="scene-summary-card scene-summary-card--error">
              <p>{sceneError}</p>
            </section>
          ) : null}
          {overviewError ? (
            <section className="scene-summary-card scene-summary-card--error">
              <p>{overviewError}</p>
            </section>
          ) : null}
        </>
      }
      stage={
        <div className="overview-canvas">
          <ViewerCanvas
            modelUrlByAssetId={modelUrlByAssetId}
            renderStyleByAssetId={renderStyleByAssetId}
            flowEnabled={flowEnabled}
            resetViewNonce={resetViewNonce}
          />
          <div className="overview-hint">点击设备进入详情（运行态轮询）</div>
        </div>
      }
      sidebarClassName="scene-subspace__sidebar--summary"
      stageClassName="scene-subspace__stage--runtime"
    />
  )
}
