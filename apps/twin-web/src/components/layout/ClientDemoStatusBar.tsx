import { Link } from 'react-router-dom'

import {
  type ClientDemoTab,
  type ClientFaultScenario,
  type ClientStrategyPhase,
  type ClientAiStrategyStatus,
  useClientDemoStore,
} from '@/store/clientDemoStore'

function phaseLabel(phase: ClientStrategyPhase) {
  switch (phase) {
    case 'collect':
      return '数据采集'
    case 'infer':
      return '策略推理'
    case 'dispatch':
      return '策略下发'
    case 'verify':
      return '验证闭环'
    case 'complete':
      return '演示完成'
    case 'idle':
    default:
      return '空闲'
  }
}

function faultLabel(type: ClientFaultScenario | null) {
  switch (type) {
    case 'pump':
      return '泵组故障'
    case 'towerEfficiency':
      return '塔效下降'
    case 'condenserRise':
      return '冷凝温升'
    case 'manualFallback':
      return '手动回退'
    default:
      return '故障演练'
  }
}

function statusText(status: ClientAiStrategyStatus, phase: ClientStrategyPhase, fault: ClientFaultScenario | null) {
  switch (status) {
    case 'running':
      return `策略演示中 · ${phaseLabel(phase)}`
    case 'fault':
      return `故障联动中 · ${faultLabel(fault)}`
    case 'idle':
    default:
      return '已待命 · 点击“策略演示”或“故障演练”'
  }
}

function preferredTab(status: ClientAiStrategyStatus, phase: ClientStrategyPhase, activeTab: ClientDemoTab): ClientDemoTab {
  if (status === 'fault') {
    return 'scene'
  }
  if (status === 'running') {
    if (phase === 'dispatch') return 'scene'
    if (phase === 'verify' || phase === 'complete') return 'reports'
    return 'strategy'
  }
  return activeTab
}

const tabRoute: Record<ClientDemoTab, string> = {
  overview: '/c/overview',
  scene: '/c/scene',
  strategy: '/c/strategy',
  reports: '/c/reports',
}

const tabLabel: Record<ClientDemoTab, string> = {
  overview: '驾驶舱总览',
  scene: '3D 机房交互',
  strategy: '控制流程',
  reports: '报表分析',
}

const statusClass: Record<ClientAiStrategyStatus, 'idle' | 'running' | 'fault'> = {
  idle: 'idle',
  running: 'running',
  fault: 'fault',
}

export function ClientDemoStatusBar() {
  const activeTab = useClientDemoStore((state) => state.activeTab)
  const activeFaultScenario = useClientDemoStore((state) => state.activeFaultScenario)
  const activeStrategyPhase = useClientDemoStore((state) => state.activeStrategyPhase)
  const aiStrategyStatus = useClientDemoStore((state) => state.aiStrategyStatus)
  const strategyEvents = useClientDemoStore((state) => state.strategyEvents)
  const runningMode = useClientDemoStore((state) => state.runningMode)
  const demoHint = useClientDemoStore((state) => state.demoStage)
  const targetTab = preferredTab(aiStrategyStatus, activeStrategyPhase, activeTab)
  const currentSceneId = useClientDemoStore((state) => state.currentSceneId)
  const sceneTarget = currentSceneId ? `/c/scene/${encodeURIComponent(currentSceneId)}` : '/c/scene'
  const tabRouteWithScene = { ...tabRoute, scene: sceneTarget }

  return (
    <section className="client-demo-status-bar">
      <div className="client-demo-status-bar__status">
        <span className={`client-demo-status-pill client-demo-status-pill--${statusClass[aiStrategyStatus]}`}>
          {aiStrategyStatus}
        </span>
        <p>{statusText(aiStrategyStatus, activeStrategyPhase, activeFaultScenario)}</p>
      </div>
      <div className="client-demo-status-bar__meta">
        <span>运行模式：{runningMode}</span>
        <span>当前聚焦：{tabLabel[targetTab]}</span>
        <span>提示阶段：{demoHint}</span>
        {strategyEvents.at(-1)?.title ? <span>最近：{strategyEvents.at(-1)?.title}</span> : null}
        <Link className="secondary scene-link-button" to={tabRouteWithScene[targetTab]}>
          前往{tabLabel[targetTab]}
        </Link>
      </div>
    </section>
  )
}
