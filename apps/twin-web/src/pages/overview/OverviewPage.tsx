import { useEffect, useMemo, useState } from 'react'
import { ViewerCanvas } from '@/components/scene/ViewerCanvas'
import { loadEquipmentCatalog, type RenderStyle } from '@/services/loadEquipmentCatalog'
import { loadCurrentSceneIntoStore } from '@/services/loadDemoScene'
import { useEditorUiStore } from '@/store/editorUiStore'
import { useSceneStore } from '@/store/sceneStore'
import { useRuntimeStore } from '@/store/runtimeStore'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import { useSyncRuntimeWithScene } from '@/hooks/useSyncRuntimeWithScene'

export function OverviewPage() {
  useSyncRuntimeWithScene()
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [sceneError, setSceneError] = useState<string | null>(null)
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
    if (useSceneStore.getState().devices.length > 0) return
    void loadCurrentSceneIntoStore().then((result) => {
      if (!active) return
      setSceneError(result.ok ? null : result.error)
    })
    return () => {
      active = false
    }
  }, [])

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
    <div className="overview-page">
      <aside className="overview-side">
        <section className="overview-card">
          <h2>关键指标</h2>
          <ul className="overview-kpi">
            <li>
              <span className="kpi-label">总功率</span>
              <span className="kpi-value">{totalPower.toFixed(1)} kW</span>
            </li>
            <li>
              <span className="kpi-label">平均 COP</span>
              <span className="kpi-value">{avgCop.toFixed(2)}</span>
            </li>
            <li>
              <span className="kpi-label">活动告警</span>
              <span className="kpi-value">{activeAlarmCount}</span>
            </li>
          </ul>
          <p className="muted small">运行态更新时间：{lastUpdatedAt ?? '—'}</p>
          {loadingOverview ? <p className="muted small">运行态加载中…</p> : null}
        </section>
        <section className="overview-card">
          <h2>运行模式</h2>
          <p className="overview-mode">AI_OPT</p>
          <p className="muted small">在满足末端与设备约束下由上层优化器给出建议，底层仍由 PLC 执行（Mock）。</p>
        </section>
        <section className="overview-card">
          <h2>AI 建议摘要</h2>
          <p className="muted small">
            预测午后峰值负荷略升，建议提前 30min 微调供水温度带并检查泵组组合；请以现场策略版本为准。
          </p>
        </section>
        <section className="overview-card">
          <h2>机房边界</h2>
          <p className="muted small">演示场景未挂载墙体轮廓；可在编排页扩展房间多边形后在此叠加显示。</p>
        </section>
        <section className="overview-card">
          <h2>管道流动</h2>
          <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>流动模式</span>
            <input
              type="checkbox"
              checked={flowEnabled}
              onChange={(e) => setFlowEnabled(e.target.checked)}
              aria-label="管道流动模式"
            />
          </label>
          <p className="muted small">开启后，直管段会显示流动虚线效果（GPU/CPU 开销会略增）。</p>
        </section>
        {catalogError ? (
          <section className="overview-card">
            <h2>设备库错误</h2>
            <p className="muted small">{catalogError}</p>
          </section>
        ) : null}
        {sceneError ? (
          <section className="overview-card">
            <h2>场景错误</h2>
            <p className="muted small">{sceneError}</p>
          </section>
        ) : null}
        {overviewError ? (
          <section className="overview-card">
            <h2>运行态错误</h2>
            <p className="muted small">{overviewError}</p>
          </section>
        ) : null}
      </aside>
      <main className="overview-canvas">
        <ViewerCanvas
          modelUrlByAssetId={modelUrlByAssetId}
          renderStyleByAssetId={renderStyleByAssetId}
          flowEnabled={flowEnabled}
        />
        <div className="overview-hint">点击设备进入详情（运行态轮询）</div>
      </main>
    </div>
  )
}
