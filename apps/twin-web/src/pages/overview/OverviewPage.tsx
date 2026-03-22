import { useEffect, useMemo, useState } from 'react'
import { ViewerCanvas } from '@/components/scene/ViewerCanvas'
import { loadEquipmentCatalog } from '@/services/loadEquipmentCatalog'
import { loadDemoSceneIntoStore } from '@/services/loadDemoScene'
import { useSceneStore } from '@/store/sceneStore'

export function OverviewPage() {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)

  useEffect(() => {
    let c = true
    loadEquipmentCatalog()
      .then((x) => {
        if (c) setCatalog(x)
      })
      .catch(() => {
        if (c) setCatalog([])
      })
    return () => {
      c = false
    }
  }, [])

  useEffect(() => {
    if (useSceneStore.getState().devices.length === 0) void loadDemoSceneIntoStore()
  }, [])

  const modelGlbByAssetId = useMemo(() => {
    const m: Record<string, boolean> = {}
    catalog?.forEach((a) => {
      m[a.assetId] = a.modelGlb
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
              <span className="kpi-label">PUE（演示）</span>
              <span className="kpi-value">1.38</span>
            </li>
            <li>
              <span className="kpi-label">冷负荷</span>
              <span className="kpi-value">2,840 kW</span>
            </li>
            <li>
              <span className="kpi-label">当日能耗</span>
              <span className="kpi-value">18.2 MWh</span>
            </li>
          </ul>
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
      </aside>
      <main className="overview-canvas">
        <ViewerCanvas modelGlbByAssetId={modelGlbByAssetId} />
        <div className="overview-hint">点击设备进入详情（Mock 数据）</div>
      </main>
    </div>
  )
}
