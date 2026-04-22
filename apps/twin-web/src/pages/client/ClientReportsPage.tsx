import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
import { ClientDemoStatusBar } from '@/components/layout/ClientDemoStatusBar'
import { listNamedScenes, loadNamedSceneIntoStore } from '@/services/loadDemoScene'
import type { SceneLibraryItem } from '@/schemas/scene'
import type { TrendSample } from '@/schemas/deviceRuntime'
import { useClientDemoStore } from '@/store/clientDemoStore'
import { useRuntimeStore } from '@/store/runtimeStore'
import { useSceneStore } from '@/store/sceneStore'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'

const TrendChart = lazy(async () => {
  const mod = await import('@/components/charts/TrendChart')
  return { default: mod.TrendChart }
})

function buildMockTrend(base: number, seed: number, points = 10): TrendSample[] {
  return Array.from({ length: points }, (_, index) => {
    const fluctuation = ((seed + index * 17) % 11) - 5
    return {
      t: new Date(Date.now() - (points - index) * 60 * 60 * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      v: Number(Math.max(0, base + fluctuation + (index % 3 === 0 ? 1.2 : -0.6)).toFixed(2)),
    }
  })
}

function sanitizeClientError(message: string | null) {
  if (!message) return null
  return message.includes('502') ? null : message
}

export function ClientReportsPage() {
  const [items, setItems] = useState<SceneLibraryItem[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingScene, setLoadingScene] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [sceneError, setSceneError] = useState<string | null>(null)

  const devices = useSceneStore((s) => s.devices)
  const runtimes = useRuntimeStore((s) => s.deviceRuntimeById)
  const totalPower = useRuntimeStore((s) => s.totalPower)
  const avgCop = useRuntimeStore((s) => s.avgCop)
  const activeAlarmCount = useRuntimeStore((s) => s.activeAlarmCount)
  const loadingOverview = useRuntimeStore((s) => s.loadingOverview)
  const fetchOverview = useRuntimeStore((s) => s.fetchOverview)
  const refreshRuntimes = useRuntimeStore((s) => s.refreshRuntimes)
  const currentSceneId = useClientDemoStore((s) => s.currentSceneId)
  const setCurrentSceneId = useClientDemoStore((s) => s.setCurrentSceneId)
  const strategyEvents = useClientDemoStore((s) => s.strategyEvents)
  const setActiveTab = useClientDemoStore((s) => s.setActiveTab)
  const activeStrategyPhase = useClientDemoStore((s) => s.activeStrategyPhase)
  const isStrategyRunning = useClientDemoStore((s) => s.aiStrategyStatus === 'running')
  const recentEvents = strategyEvents.slice(-4).reverse()

  useEffect(() => {
    let active = true
    setLoadingList(true)
    void (async () => {
      const result = await listNamedScenes()
      if (!active) return
      setLoadingList(false)
      if (!result.ok) {
        setListError(sanitizeClientError(result.error))
        return
      }
      setItems(result.data.items)
      if (!selectedSceneId) {
        const fallbackSceneId = result.data.items.find((item) => item.id === currentSceneId)?.id ?? result.data.items[0]?.id ?? null
        setSelectedSceneId(fallbackSceneId)
        setCurrentSceneId(fallbackSceneId)
      }
      setListError(null)
    })()
    return () => {
      active = false
    }
  }, [currentSceneId, setCurrentSceneId])

  useEffect(() => {
    if (!selectedSceneId) return
    setCurrentSceneId(selectedSceneId)
  }, [selectedSceneId, setCurrentSceneId])

  useEffect(() => {
    if (!selectedSceneId) return
    let active = true
    setLoadingScene(true)
    void loadNamedSceneIntoStore(selectedSceneId).then((result) => {
      if (!active) return
      setSceneError(result.ok ? null : sanitizeClientError(result.error))
      setLoadingScene(false)
    })
    return () => {
      active = false
    }
  }, [selectedSceneId])

  useRuntimePolling(
    async () => {
      await Promise.all([fetchOverview(), refreshRuntimes(devices)])
    },
    10_000,
    devices.length > 0 && Boolean(selectedSceneId),
  )

  const selectedScene = useMemo(() => items.find((item) => item.id === selectedSceneId) ?? null, [items, selectedSceneId])

  const rows = useMemo(
    () =>
      devices.map((device) => {
        const runtime = runtimes.get(device.id)
        return {
          ...device,
          status: runtime?.onlineStatus ?? 'offline',
          alarmCount: runtime?.alarms.length ?? 0,
          updatedAt: runtime?.updatedAt ?? '—',
        }
      }),
    [devices, runtimes],
  )

  const onlineCount = rows.filter((row) => row.status === 'online').length
  const alarmPeak = rows.reduce((sum, row) => sum + row.alarmCount, 0)
  const totalPowerValue = totalPower || 670
  const avgCopValue = avgCop || 4.2
  const coolingLoad = Math.max(Math.round(totalPowerValue * 4.08), 2813)
  const todaySavedEnergy = Math.max(Math.round(totalPowerValue * 2.74), 1834)
  const savingRate = Math.max(Number(((avgCopValue - 3.72) * 26).toFixed(1)), 12.5)
  const strategyYield = Math.max(Number((todaySavedEnergy * 0.78).toFixed(0)), 1430)

  const copTrend = buildMockTrend(avgCopValue, sceneIdSeed(selectedSceneId), 12)
  const powerTrend = buildMockTrend(totalPowerValue, sceneIdSeed(selectedSceneId, 3), 12).map((item) => ({
    ...item,
    v: Number(item.v.toFixed(2)),
  }))
  const tempRiseTrend = buildMockTrend(7.6, sceneIdSeed(selectedSceneId, 7), 12)
  const flowTrend = buildMockTrend(filteredFlowValue(devices.length, totalPower), sceneIdSeed(selectedSceneId, 13), 12)
  const alarmTrend = buildMockTrend(alarmPeak / Math.max(rows.length, 1), sceneIdSeed(selectedSceneId, 17), 12)
  const responseTrend = buildMockTrend(8.2, sceneIdSeed(selectedSceneId, 19), 12)

  useEffect(() => {
    setActiveTab('reports')
  }, [setActiveTab])

  return (
    <div className="scenes-workbench client-reports-page">
      <SceneWorkspaceHeader
        eyebrow="运营报表"
        title="报表分析"
        description="按客户汇报视图组织节能收益、趋势报表与设备维度明细。"
        children={<ClientDemoStatusBar />}
        actions={
          <>
            <label className="toolbar-field">
              <span className="toolbar-field-label">场景</span>
              <select
                className="toolbar-select"
                value={selectedSceneId ?? ''}
                onChange={(event) => setSelectedSceneId(event.target.value || null)}
              >
                {items.length === 0 ? <option value="">暂无场景</option> : null}
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <Link className="secondary scene-link-button" to="/c/overview">
              返回总览
            </Link>
            <Link className="secondary scene-link-button" to="/c/scene">
              返回 3D
            </Link>
          </>
        }
      />

      {loadingList ? <p className="toolbar-hint">加载场景列表…</p> : null}
      {loadingScene ? <p className="toolbar-hint">切换场景，刷新报表中…</p> : null}
      {listError ? <p className="toolbar-row error">{listError}</p> : null}
      {sceneError ? <p className="toolbar-row error">{sceneError}</p> : null}

      <section className="client-reports-kpis">
        <article className="client-reports-kpi-card">
          <span>当前总冷量</span>
          <strong>{coolingLoad.toLocaleString()} RT</strong>
          <p>样板机房综合输出</p>
        </article>
        <article className="client-reports-kpi-card">
          <span>当前总功率</span>
          <strong>{totalPowerValue.toFixed(0)} kW</strong>
          <p>主机、泵组、冷却塔协同负载</p>
        </article>
        <article className="client-reports-kpi-card">
          <span>系统实时 COP</span>
          <strong>{avgCopValue.toFixed(2)}</strong>
          <p>当前节能运行区间</p>
        </article>
        <article className="client-reports-kpi-card">
          <span>今日节电量</span>
          <strong>{todaySavedEnergy.toLocaleString()} kWh</strong>
          <p>策略累计收益</p>
        </article>
        <article className="client-reports-kpi-card">
          <span>今日节电率</span>
          <strong>{savingRate.toFixed(1)}%</strong>
          <p>相较基准控制</p>
        </article>
        <article className="client-reports-kpi-card">
          <span>运行模式</span>
          <strong>{isStrategyRunning ? '策略执行中' : 'AI 优化监测中'}</strong>
          <p>{recentEvents[0]?.title ?? '系统处于演示待命'}</p>
        </article>
      </section>

      <section className="client-reports-main">
        <div className="client-reports-grid">
          <article className="scenes-card client-reports-card">
            <h2>COP 曲线</h2>
            <Suspense fallback={<div className="trend-chart" />}>
              <TrendChart data={copTrend} seriesName="COP" />
            </Suspense>
          </article>
          <article className="scenes-card client-reports-card">
            <h2>总功率趋势</h2>
            <Suspense fallback={<div className="trend-chart" />}>
              <TrendChart data={powerTrend} seriesName="kW" />
            </Suspense>
          </article>
          <article className="scenes-card client-reports-card">
            <h2>供回水温升</h2>
            <Suspense fallback={<div className="trend-chart" />}>
              <TrendChart data={tempRiseTrend} seriesName="ΔT" />
            </Suspense>
          </article>
          <article className="scenes-card client-reports-card">
            <h2>回路流量趋势</h2>
            <Suspense fallback={<div className="trend-chart" />}>
              <TrendChart data={flowTrend} seriesName="t/h" />
            </Suspense>
          </article>
          <article className="scenes-card client-reports-card">
            <h2>告警趋势</h2>
            <Suspense fallback={<div className="trend-chart" />}>
              <TrendChart data={alarmTrend} seriesName="count" />
            </Suspense>
          </article>
          <article className="scenes-card client-reports-card">
            <h2>响应延迟</h2>
            <Suspense fallback={<div className="trend-chart" />}>
              <TrendChart data={responseTrend} seriesName="s" />
            </Suspense>
          </article>
        </div>

        <aside className="client-reports-sidebar">
          <section className="scenes-card client-reports-panel">
            <div className="client-reports-panel__eyebrow">收益概览</div>
            <h2>今日策略收益</h2>
            <p className="client-reports-panel__lead">{strategyYield.toLocaleString()} 元</p>
            <div className="client-reports-panel__stats">
              <span>在线设备 {onlineCount}/{devices.length}</span>
              <span>活动告警 {activeAlarmCount}</span>
            </div>
            <div className="client-reports-panel__stats">
              <span>总告警条目 {alarmPeak}</span>
              <span>场景 {selectedScene?.name ?? '未选择'}</span>
            </div>
          </section>

          <section className="scenes-card client-reports-panel">
            <div className="client-reports-panel__eyebrow">策略说明</div>
            <h2>{strategyEvents.at(-1)?.title ?? 'AI 持续寻优'}</h2>
            <p>{recentEvents[0]?.description ?? '当前维持基线运行状态，报表页同步展示节能收益、负载趋势与异常回溯。'}</p>
          </section>

          <section className="scenes-card client-reports-panel">
            <div className="client-reports-panel__eyebrow">报表事件流</div>
            <h2>{isStrategyRunning ? `当前阶段 · ${activeStrategyPhase}` : '最近策略事件'}</h2>
            <div className="client-event-feed">
              {recentEvents.length === 0 ? <p className="toolbar-hint">暂无事件</p> : null}
              {recentEvents.map((event) => (
                <div key={event.id} className={`client-event-item client-event-item--${event.level}`}>
                  <strong>{event.title}</strong>
                  <p className="muted small">{event.description}</p>
                  <span className="toolbar-hint">{event.time}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="scenes-card client-reports-table-card">
        <h2>设备报表明细</h2>
        {rows.length === 0 ? <p className="toolbar-hint">当前场景无设备。</p> : null}
        {rows.length > 0 ? (
          <table className="detail-table">
            <thead>
              <tr>
                <th>设备</th>
                <th>系统</th>
                <th>状态</th>
                <th>告警</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
        <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.system}</td>
                  <td>
                    <span className={`quality ${item.status === 'online' ? 'quality--good' : 'toolbar-hint'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.alarmCount}</td>
                  <td>{item.updatedAt}</td>
                  <td>
                    <Link
                      className="secondary scene-link-button"
                      to={`/c/device/${encodeURIComponent(item.id)}${
                        selectedSceneId ? `?sceneId=${encodeURIComponent(selectedSceneId)}` : ''
                      }`}
                    >
                      查看明细
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  )
}

function sceneIdSeed(sceneId: string | null, offset = 0): number {
  if (!sceneId) return 17 + offset
  let seed = 0
  for (let i = 0; i < sceneId.length; i += 1) {
    seed += sceneId.charCodeAt(i)
  }
  return seed + offset
}

function filteredFlowValue(deviceCount: number, totalPower: number): number {
  if (!deviceCount) return 0
  return totalPower / deviceCount
}
