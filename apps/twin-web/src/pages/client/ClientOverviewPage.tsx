import { Link } from 'react-router-dom'

import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
import { ClientDemoStatusBar } from '@/components/layout/ClientDemoStatusBar'
import { useClientDemoStore } from '@/store/clientDemoStore'
import type { SceneLibraryItem } from '@/schemas/scene'
import { listNamedScenes, loadNamedSceneIntoStore } from '@/services/loadDemoScene'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import { useRuntimeStore } from '@/store/runtimeStore'
import { useSceneStore } from '@/store/sceneStore'
import { useEffect, useMemo, useState } from 'react'

type CockpitMetric = {
  label: string
  value: string
  hint: string
}

type TrendCard = {
  title: string
  unit: string
  values: number[]
  color: string
  fill: string
}

const powerTrend = [688, 714, 732, 728, 706, 676, 638, 611, 598, 603, 629, 661, 694, 719]
const coolingTrend = [2980, 3042, 3035, 2962, 2820, 2664, 2526, 2502, 2588, 2724, 2868, 2942, 2968, 2954]
const copTrend = [4.31, 4.37, 4.42, 4.41, 4.33, 4.18, 4.02, 3.91, 3.86, 3.9, 4.01, 4.16, 4.31, 4.38]

function buildTrendPath(values: number[]) {
  if (values.length === 0) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(max - min, 1)
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 86 - ((value - min) / span) * 58
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function TrendSparkline({ title, unit, values, color, fill }: TrendCard) {
  const linePath = buildTrendPath(values)
  const areaPath = `${linePath} L 100 100 L 0 100 Z`
  const max = Math.max(...values)
  const min = Math.min(...values)

  return (
    <article className="client-cockpit-chart-card">
      <div className="client-cockpit-chart-card__header">
        <h3>{title}</h3>
        <span>{unit}</span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="client-cockpit-chart-card__svg" aria-hidden="true">
        <defs>
          <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <line x1="0" y1="24" x2="100" y2="24" className="client-cockpit-chart-card__gridline" />
        <line x1="0" y1="56" x2="100" y2="56" className="client-cockpit-chart-card__gridline" />
        <line x1="0" y1="88" x2="100" y2="88" className="client-cockpit-chart-card__gridline" />
        <path d={areaPath} fill={`url(#${fill})`} />
        <path d={linePath} stroke={color} className="client-cockpit-chart-card__line" />
      </svg>
      <div className="client-cockpit-chart-card__footer">
        <span>{min.toLocaleString()} {unit}</span>
        <span>{max.toLocaleString()} {unit}</span>
      </div>
      <div className="client-cockpit-chart-card__ticks">
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
      </div>
    </article>
  )
}

export function ClientOverviewPage() {
  const [items, setItems] = useState<SceneLibraryItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [loadingListError, setLoadingListError] = useState<string | null>(null)
  const [loadingSceneError, setLoadingSceneError] = useState<string | null>(null)

  const [isReloading, setIsReloading] = useState(false)
  const [loadingScene, setLoadingScene] = useState(false)

  const deviceCount = useSceneStore((s) => s.devices.length)
  const totalPower = useRuntimeStore((s) => s.totalPower)
  const avgCop = useRuntimeStore((s) => s.avgCop)
  const activeAlarmCount = useRuntimeStore((s) => s.activeAlarmCount)
  const lastUpdatedAt = useRuntimeStore((s) => s.lastUpdatedAt)
  const loadingOverview = useRuntimeStore((s) => s.loadingOverview)
  const overviewError = useRuntimeStore((s) => s.overviewError)
  const fetchOverview = useRuntimeStore((s) => s.fetchOverview)

  const strategyEvents = useClientDemoStore((s) => s.strategyEvents)
  const setCurrentSceneId = useClientDemoStore((s) => s.setCurrentSceneId)
  const setActiveTab = useClientDemoStore((s) => s.setActiveTab)

  const selectedScene = useMemo(() => items.find((item) => item.id === selectedSceneId) ?? null, [items, selectedSceneId])

  useRuntimePolling(async () => {
    await fetchOverview()
  }, 10_000, deviceCount > 0)

  const refreshScenes = async () => {
    setLoadingList(true)
    if (!loadingList && isReloading === false) {
      setIsReloading(true)
    }
    const result = await listNamedScenes()
    setLoadingList(false)
    setIsReloading(false)
    if (!result.ok) {
      setLoadingListError(result.error)
      return
    }

    setItems(result.data.items)
    setLoadingListError(null)
    if (!selectedSceneId || !result.data.items.some((item) => item.id === selectedSceneId)) {
      setSelectedSceneId(result.data.items[0]?.id ?? null)
      setCurrentSceneId(result.data.items[0]?.id ?? null)
    }
  }

  useEffect(() => {
    void refreshScenes()
  }, [setCurrentSceneId])

  useEffect(() => {
    setActiveTab('overview')
  }, [setActiveTab])

  useEffect(() => {
    if (!selectedSceneId) {
      setLoadingScene(false)
      setLoadingSceneError(null)
      return
    }

    let active = true
    setLoadingScene(true)
    void loadNamedSceneIntoStore(selectedSceneId).then((result) => {
      if (!active) return
      setLoadingSceneError(result.ok ? null : result.error)
      setLoadingScene(false)
      if (result.ok) {
        setCurrentSceneId(selectedSceneId)
      }
    })
    return () => {
      active = false
    }
  }, [selectedSceneId, setCurrentSceneId])

  const recentEvents = strategyEvents.slice(-4).reverse()
  const totalAlarms = loadingList ? '—' : activeAlarmCount
  const currentModeLabel = activeAlarmCount > 0 ? '保护监测中' : 'AI 优化监测中'
  const todaySavedEnergy = Math.max(Math.round(totalPower * 2.7), 1834)
  const todaySavingRate = Math.max((avgCop - 3.72) * 26, 12.5)

  const metricCards: CockpitMetric[] = [
    {
      label: '当前总冷量',
      value: `${Math.max(Math.round(totalPower * 4.08), 2813).toLocaleString()} RT`,
      hint: '样板机房综合输出',
    },
    {
      label: '当前总功率',
      value: `${Math.max(Math.round(totalPower), 670).toLocaleString()} kW`,
      hint: '含主机、泵组、冷却塔',
    },
    {
      label: '系统实时 COP',
      value: avgCop > 0 ? avgCop.toFixed(2) : '4.20',
      hint: 'AI 持续寻优目标',
    },
    {
      label: '今日节电量',
      value: `${todaySavedEnergy.toLocaleString()} kWh`,
      hint: '策略累计收益',
    },
    {
      label: '今日节电率',
      value: `${todaySavingRate.toFixed(1)}%`,
      hint: '相较基准控制',
    },
    {
      label: '当前运行模式',
      value: currentModeLabel,
      hint: activeAlarmCount > 0 ? '告警约束已生效' : 'AI 优化持续输出',
    },
  ]

  const trendCards: TrendCard[] = [
    { title: '24h 总功率趋势', unit: 'kW', values: powerTrend, color: '#35c6ff', fill: 'client-cockpit-power-fill' },
    { title: '24h 总冷量趋势', unit: 'RT', values: coolingTrend, color: '#4d8eff', fill: 'client-cockpit-cooling-fill' },
    { title: '24h 系统 COP 趋势', unit: '', values: copTrend, color: '#36d7a4', fill: 'client-cockpit-cop-fill' },
  ]

  return (
    <div className="scenes-workbench client-cockpit-page">
      <SceneWorkspaceHeader
        eyebrow="客户驾驶舱"
        title="驾驶舱总览"
        description="按展示型驾驶舱组织机房运行指标、趋势曲线与 AI 策略说明。"
        children={<ClientDemoStatusBar />}
        actions={
          <>
            <button type="button" className="secondary" onClick={() => void refreshScenes()} disabled={loadingList}>
              {loadingList ? '刷新中…' : '刷新指标'}
            </button>
            <Link className="secondary scene-link-button" to="/c/scene">
              进入 3D 机房交互
            </Link>
            <Link className="secondary scene-link-button" to="/c/strategy">
              查看控制流程图
            </Link>
          </>
        }
      />

      <section className="client-cockpit-kpis">
        {metricCards.map((metric) => (
          <article key={metric.label} className="client-cockpit-kpi-card">
            <span className="client-cockpit-kpi-card__label">{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.hint}</p>
          </article>
        ))}
      </section>

      <section className="client-cockpit-main">
        <div className="client-cockpit-trends">
          {trendCards.map((card) => (
            <TrendSparkline key={card.title} {...card} />
          ))}
        </div>

        <aside className="client-cockpit-sidebar">
          <section className="client-cockpit-panel">
            <div className="client-cockpit-panel__eyebrow">策略说明</div>
            <h2>当前 AI 节能逻辑</h2>
            <p className="client-cockpit-panel__lead">
              {selectedScene?.name ?? '样板机房'} 当前保持多设备联动寻优，通过负荷、冷凝温差与泵塔频率的协同调节维持高 COP 区间。
            </p>
          </section>

          <section className="client-cockpit-panel client-cockpit-panel--accent">
            <div className="client-cockpit-panel__eyebrow">当前策略</div>
            <h3>AI 根据负荷与冷凝温差联动泵塔</h3>
            <p>
              当前保持双主机 + 双冷却泵 + 三塔低频运行，动态调节冷冻泵与冷却塔频率，在保障出水温稳定的同时压低单位冷量能耗。
            </p>
          </section>

          <section className="client-cockpit-panel">
            <div className="client-cockpit-panel__eyebrow">演示焦点</div>
            <h3>{recentEvents[0]?.title ?? '系统处于演示待命'}</h3>
            <p>{recentEvents[0]?.description ?? '当前展示基线运行状态，可随时播放策略演示或切换到 3D 机房交互。'}</p>
          </section>

          <section className="client-cockpit-panel client-cockpit-panel--compact">
            <div className="client-cockpit-panel__stats">
              <span>在线设备 {deviceCount}</span>
              <span>活动告警 {totalAlarms}</span>
            </div>
            <div className="client-cockpit-panel__stats">
              <span>实时更新时间 {lastUpdatedAt ?? '—'}</span>
              <span>{loadingOverview || loadingScene ? '运行态同步中…' : '运行态已同步'}</span>
            </div>
            {loadingListError ? <p className="toolbar-hint error">{loadingListError}</p> : null}
            {loadingSceneError ? <p className="toolbar-hint error">{loadingSceneError}</p> : null}
            {overviewError ? <p className="toolbar-hint error">{overviewError}</p> : null}
          </section>
        </aside>
      </section>

      <section className="client-cockpit-footer">
        <div className="client-cockpit-footer__group client-cockpit-scene-pills">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`client-cockpit-scene-pill${item.id === selectedSceneId ? ' client-cockpit-scene-pill--active' : ''}`}
              onClick={() => setSelectedSceneId(item.id)}
            >
              {item.name}
            </button>
          ))}
          {items.length === 0 && !loadingList ? <span className="toolbar-hint">暂无可用场景</span> : null}
        </div>

        <div className="client-cockpit-footer__group client-cockpit-quicklinks">
          <Link className="secondary scene-link-button" to={selectedSceneId ? `/c/scene/${encodeURIComponent(selectedSceneId)}` : '/c/scene'}>
            进入样板机房 3D 视图
          </Link>
          <Link className="secondary scene-link-button" to="/c/reports">
            查看报表分析
          </Link>
          <Link className="secondary scene-link-button" to="/c/strategy">
            查看控制流程图
          </Link>
        </div>
      </section>
    </div>
  )
}
