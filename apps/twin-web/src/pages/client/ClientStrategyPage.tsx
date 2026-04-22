import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ClientDemoStatusBar } from '@/components/layout/ClientDemoStatusBar'
import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import {
  type ClientAiStrategyStatus,
  type ClientStrategyEvent,
  type ClientStrategyPhase,
  useClientDemoStore,
} from '@/store/clientDemoStore'
import { useRuntimeStore } from '@/store/runtimeStore'
import { useSceneStore } from '@/store/sceneStore'

type StrategyNodeId = 'load' | 'chiller' | 'chwPump' | 'cwPump' | 'tower' | 'safety' | 'fallback' | 'result'

type StrategyNode = {
  id: StrategyNodeId
  title: string
  lines: string[]
  x: number
  y: number
}

const strategyNodes: StrategyNode[] = [
  { id: 'load', title: '负荷输入', lines: ['实时冷量', '室外湿球'], x: 11, y: 18 },
  { id: 'chiller', title: '主机群控决策', lines: ['开停台数', '负载分配'], x: 25, y: 10 },
  { id: 'chwPump', title: '冷冻泵优化', lines: ['频率调节', '压差校核'], x: 25, y: 56 },
  { id: 'cwPump', title: '冷却泵优化', lines: ['流量匹配', '冷凝温差'], x: 48, y: 10 },
  { id: 'tower', title: '冷却塔优化', lines: ['风机频率', '投运台数'], x: 48, y: 56 },
  { id: 'safety', title: '安全约束', lines: ['告警边界', '联锁优先'], x: 71, y: 10 },
  { id: 'fallback', title: '回退逻辑', lines: ['保守模式', '兜底策略'], x: 71, y: 56 },
  { id: 'result', title: '执行结果', lines: ['COP 变化', '告警变化'], x: 85, y: 33 },
]

const strategyEdges: Array<{ from: StrategyNodeId; to: StrategyNodeId; danger?: boolean }> = [
  { from: 'load', to: 'chiller' },
  { from: 'load', to: 'chwPump' },
  { from: 'chiller', to: 'cwPump' },
  { from: 'chwPump', to: 'cwPump' },
  { from: 'cwPump', to: 'tower' },
  { from: 'chiller', to: 'safety' },
  { from: 'tower', to: 'safety' },
  { from: 'safety', to: 'result' },
  { from: 'safety', to: 'fallback', danger: true },
  { from: 'fallback', to: 'result', danger: true },
]

const phaseLabel: Record<ClientStrategyPhase, string> = {
  idle: '待命',
  collect: '采集中',
  infer: '推理中',
  dispatch: '下发中',
  verify: '校核中',
  complete: '已完成',
}

const phaseDescriptions: Record<ClientStrategyPhase, string> = {
  idle: '等待策略演示或故障演练触发，当前控制链路保持只读监控。',
  collect: '正在聚合实时冷量、室外气象、压差与流量点位，形成策略输入面。',
  infer: '主机、冷冻泵与冷却侧策略同时推理，匹配最优开停台数与频率区间。',
  dispatch: '向执行层下发控制建议，联动冷冻泵、冷却泵与冷却塔动作序列。',
  verify: '回看告警边界、关键指标与联锁约束，判断是否进入保守模式。',
  complete: '本轮演示闭环结束，恢复到默认监控态。',
}

const phaseReasonText: Record<ClientStrategyPhase, string> = {
  idle: '当前没有主动控制动作，保持默认调度策略。',
  collect: '先看负荷输入，避免在原始点位不完整时直接下发控制指令。',
  infer: '先算主机群控，再计算泵与塔，保证水力与热力路径一致。',
  dispatch: '下发阶段会优先执行对 COP 影响最大的动作，并限制瞬时波动。',
  verify: '校核阶段优先检查告警、联锁和执行反馈，安全约束高于节能目标。',
  complete: '演示完成后回到基线状态，方便继续下一轮策略复盘。',
}

function getHighlightedNodeIds(
  phase: ClientStrategyPhase,
  status: ClientAiStrategyStatus,
  selectedEvent: ClientStrategyEvent | null,
) {
  const ids = new Set<StrategyNodeId>(['load'])

  if (status === 'fault') {
    ids.add('safety')
    ids.add('fallback')
    ids.add('result')
    return ids
  }

  if (phase === 'collect') {
    return ids
  }

  if (phase === 'infer') {
    ids.add('chiller')
    ids.add('chwPump')
    return ids
  }

  if (phase === 'dispatch') {
    ids.add('chiller')
    ids.add('chwPump')
    ids.add('cwPump')
    ids.add('tower')
    return ids
  }

  if (phase === 'verify' || phase === 'complete') {
    ids.add('chiller')
    ids.add('cwPump')
    ids.add('tower')
    ids.add('safety')
    ids.add('result')
  }

  if (!selectedEvent) {
    return ids
  }

  const title = `${selectedEvent.title}${selectedEvent.description}`
  if (title.includes('泵')) ids.add('chwPump')
  if (title.includes('冷却')) ids.add('cwPump')
  if (title.includes('塔')) ids.add('tower')
  if (title.includes('回退') || title.includes('告警')) ids.add('fallback')
  if (title.includes('结果') || title.includes('反馈')) ids.add('result')
  return ids
}

function edgePath(from: StrategyNode, to: StrategyNode) {
  const startX = from.x + 8
  const startY = from.y + 10
  const endX = to.x + 8
  const endY = to.y + 10
  const delta = Math.max((endX - startX) * 0.45, 6)
  return `M ${startX} ${startY} C ${startX + delta} ${startY}, ${endX - delta} ${endY}, ${endX} ${endY}`
}

export function ClientStrategyPage() {
  const [activeNode, setActiveNode] = useState<StrategyNodeId>('load')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const setActiveTab = useClientDemoStore((s) => s.setActiveTab)
  const activeStrategyPhase = useClientDemoStore((s) => s.activeStrategyPhase)
  const activeStrategyEventId = useClientDemoStore((s) => s.activeStrategyEventId)
  const activeFaultScenario = useClientDemoStore((s) => s.activeFaultScenario)
  const strategyEvents = useClientDemoStore((s) => s.strategyEvents)
  const isDemoPlaying = useClientDemoStore((s) => s.isDemoPlaying)
  const aiStrategyStatus = useClientDemoStore((s) => s.aiStrategyStatus)
  const playStrategyDemo = useClientDemoStore((s) => s.playStrategyDemo)
  const runFaultScenario = useClientDemoStore((s) => s.runFaultScenario)
  const clearFaultScenario = useClientDemoStore((s) => s.clearFaultScenario)

  const fetchOverview = useRuntimeStore((s) => s.fetchOverview)
  const totalPower = useRuntimeStore((s) => s.totalPower)
  const avgCop = useRuntimeStore((s) => s.avgCop)
  const activeAlarmCount = useRuntimeStore((s) => s.activeAlarmCount)
  const loadingOverview = useRuntimeStore((s) => s.loadingOverview)
  const deviceCount = useSceneStore((s) => s.devices.length)

  const recentEvents = useMemo(() => strategyEvents.slice(-8).reverse(), [strategyEvents])

  useEffect(() => {
    setActiveTab('strategy')
  }, [setActiveTab])

  useRuntimePolling(async () => {
    await fetchOverview()
  }, 10_000, deviceCount > 0)

  useEffect(() => {
    if (activeStrategyEventId) {
      setSelectedEventId(activeStrategyEventId)
      return
    }
    setSelectedEventId((current) => current ?? recentEvents[0]?.id ?? null)
  }, [activeStrategyEventId, recentEvents])

  const selectedEvent =
    recentEvents.find((event) => event.id === selectedEventId) ?? recentEvents[0] ?? strategyEvents.at(-1) ?? null

  const highlightedNodeIds = useMemo(
    () => getHighlightedNodeIds(activeStrategyPhase, aiStrategyStatus, selectedEvent),
    [activeStrategyPhase, aiStrategyStatus, selectedEvent],
  )

  const isActionLocked = isDemoPlaying || aiStrategyStatus === 'fault'
  const fallbackPolicy =
    activeFaultScenario === 'manualFallback'
      ? '当前已进入人工优先保护链路，策略动作暂停，等待人工确认恢复。'
      : '发现异常后先卡住执行层，再进入保守模式，最后回退到人工/基线运行。'

  const resultText =
    aiStrategyStatus === 'fault'
      ? `当前存在故障演练，活动告警 ${activeAlarmCount} 条，系统保持手动保护。`
      : `当前总功率 ${(totalPower || 0).toFixed(1)} kW，COP ${(avgCop || 0).toFixed(2)}，在线设备 ${deviceCount} 台。`

  return (
    <div className="scenes-workbench client-strategy-page">
      <SceneWorkspaceHeader
        eyebrow="运行策略中心"
        title="控制流程图"
        description="对照 demo 的流程画布布局，聚焦策略链路高亮、回退逻辑与事件解释。"
        children={<ClientDemoStatusBar />}
        actions={
          <>
            <button type="button" className="secondary" onClick={playStrategyDemo} disabled={isActionLocked}>
              播放策略演示
            </button>
            <button type="button" className="secondary danger-outline" onClick={() => runFaultScenario('pump')} disabled={isActionLocked}>
              演练：泵故障
            </button>
            <button type="button" className="secondary danger-outline" onClick={() => runFaultScenario('towerEfficiency')} disabled={isActionLocked}>
              演练：塔效降级
            </button>
            <button type="button" className="secondary danger-outline" onClick={() => runFaultScenario('condenserRise')} disabled={isActionLocked}>
              演练：冷凝温升
            </button>
            <button type="button" className="secondary" onClick={clearFaultScenario}>
              结束并回退
            </button>
            <Link className="secondary scene-link-button" to="/c/scene">
              返回 3D
            </Link>
          </>
        }
      />

      <div className="client-strategy-layout">
        <section className="scenes-card client-strategy-flow-card">
          <div className="client-strategy-flow-card__header">
            <div>
              <h2>节能控制流程图</h2>
              <p className="toolbar-hint">以解释控制逻辑而不是设备建模为核心。</p>
            </div>
            <div className={`client-strategy-phase-chip client-strategy-phase-chip--${aiStrategyStatus}`}>
              {phaseLabel[activeStrategyPhase]}
            </div>
          </div>

          <div className="client-strategy-flow">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="client-strategy-flow__edges" aria-hidden="true">
              {strategyEdges.map((edge) => {
                const from = strategyNodes.find((node) => node.id === edge.from)
                const to = strategyNodes.find((node) => node.id === edge.to)
                if (!from || !to) return null
                const active = highlightedNodeIds.has(edge.from) && highlightedNodeIds.has(edge.to)
                return (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={edgePath(from, to)}
                    className={`client-strategy-edge${active ? ' client-strategy-edge--active' : ''}${edge.danger ? ' client-strategy-edge--danger' : ''}`}
                  />
                )
              })}
            </svg>

            {strategyNodes.map((node) => {
              const active = highlightedNodeIds.has(node.id)
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`client-strategy-node${active ? ' client-strategy-node--active' : ''}${
                    node.id === 'fallback' && aiStrategyStatus === 'fault' ? ' client-strategy-node--danger' : ''
                  }${activeNode === node.id ? ' client-strategy-node--focused' : ''}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  onClick={() => setActiveNode(node.id)}
                >
                  <strong>{node.title}</strong>
                  <span>{node.lines[0]}</span>
                  <span>{node.lines[1]}</span>
                </button>
              )
            })}
          </div>

          <div className="client-strategy-flow-card__footer">
            <span>当前高亮：{selectedEvent?.title ?? phaseLabel[activeStrategyPhase]}</span>
            <span>{loadingOverview ? '运行态刷新中…' : resultText}</span>
          </div>
        </section>

        <div className="client-strategy-side">
          <section className="scenes-card">
            <div className="client-strategy-panel-head">
              <div>
                <h2>当前策略说明</h2>
                <p className="toolbar-hint">控制链路实时高亮</p>
              </div>
              <span className={`client-strategy-tone client-strategy-tone--${aiStrategyStatus}`}>{aiStrategyStatus}</span>
            </div>

            <div className="client-strategy-info-grid">
              <div className="client-strategy-summary-card client-strategy-summary-card--accent">
                <div className="toolbar-hint">当前阶段</div>
                <strong>{phaseLabel[activeStrategyPhase]}</strong>
                <p className="muted small">{selectedEvent?.description ?? phaseDescriptions[activeStrategyPhase]}</p>
              </div>

              <div className="client-strategy-summary-card">
                <div className="toolbar-hint">本次为什么这么调</div>
                <p className="muted small">{phaseReasonText[activeStrategyPhase]}</p>
              </div>
            </div>
          </section>

          <section className="scenes-card">
            <h2>异常如何退回保守模式</h2>
            <p className="toolbar-hint">安全约束优先于节能目标</p>

            <div className="client-strategy-reason-list">
              <div className="client-strategy-event-card client-strategy-event-card--active">
                <strong>回退逻辑</strong>
                <p>{fallbackPolicy}</p>
              </div>

              <div className="client-strategy-event-card">
                <strong>执行结果</strong>
                <p>{resultText}</p>
              </div>
            </div>
          </section>

          <section className="scenes-card">
            <h2>策略事件流</h2>
            <p className="toolbar-hint">点击事件高亮对应决策路径与设备。</p>

            <div className="client-strategy-event-list">
              {recentEvents.length === 0 ? <p className="toolbar-hint">暂无事件</p> : null}
              {recentEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={`client-strategy-event-card${selectedEvent?.id === event.id ? ' client-strategy-event-card--active' : ''}`}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <strong>{event.title}</strong>
                  <p>{event.description}</p>
                  <span className="toolbar-hint">{event.time}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
