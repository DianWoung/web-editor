import { create } from 'zustand'

export type ClientRunningMode = 'auto' | 'economy' | 'comfort' | 'manual'
export type ClientDemoTab = 'overview' | 'scene' | 'strategy' | 'reports'
export type ClientAiStrategyStatus = 'idle' | 'running' | 'fault'
export type ClientDemoStage = 'idle' | ClientDemoTab
export type ClientStrategyPhase = 'idle' | 'collect' | 'infer' | 'dispatch' | 'verify' | 'complete'
export type ClientFaultScenario = 'pump' | 'towerEfficiency' | 'condenserRise' | 'manualFallback'
export type ClientStrategyEventLevel = 'info' | 'warn' | 'error'

export type ClientStrategyEvent = {
  id: string
  time: string
  title: string
  description: string
  level: ClientStrategyEventLevel
  source?: 'system' | 'operator' | 'ai'
  system?: string
  strategyPhase?: ClientStrategyPhase
  targetTab?: ClientDemoTab
  faultType?: ClientFaultScenario
}

type ClientDemoState = {
  currentSceneId: string | null
  runningMode: ClientRunningMode
  selectedSystem: string
  selectedDeviceId: string | null
  flowEnabled: boolean
  aiStrategyStatus: ClientAiStrategyStatus
  demoStage: ClientDemoStage
  activeTab: ClientDemoTab
  isDemoPlaying: boolean
  activeStrategyPhase: ClientStrategyPhase
  activeStrategyEventId: string | null
  activeFaultScenario: ClientFaultScenario | null
  strategyEvents: ClientStrategyEvent[]
  demoHistory: ClientStrategyEvent[]
}

type ClientDemoActions = {
  setCurrentSceneId: (sceneId: string | null) => void
  setRunningMode: (mode: ClientRunningMode) => void
  setSelectedSystem: (system: string) => void
  setSelectedDeviceId: (deviceId: string | null) => void
  setFlowEnabled: (enabled: boolean) => void
  setActiveTab: (activeTab: ClientDemoTab) => void
  setActiveStrategyPhase: (phase: ClientStrategyPhase) => void
  setActiveStrategyEventId: (eventId: string | null) => void
  setActiveFaultScenario: (scenario: ClientFaultScenario | null) => void
  addStrategyEvent: (
    event: Omit<ClientStrategyEvent, 'id' | 'time'> & Partial<Pick<ClientStrategyEvent, 'source' | 'system'>>,
  ) => void
  playStrategyDemo: () => void
  runFaultScenario: (faultType?: ClientFaultScenario) => void
  clearFaultScenario: () => void
  clearEvents: () => void
}

type TimeoutHandle = ReturnType<typeof setTimeout>

let timerHandles: TimeoutHandle[] = []
let eventCounter = 0

function clearDemoTimers() {
  timerHandles.forEach((handle) => {
    clearTimeout(handle)
  })
  timerHandles = []
}

function nextEventId(prefix: string) {
  eventCounter += 1
  return `${prefix}-${Date.now()}-${eventCounter}`
}

function nowLabel() {
  return new Date().toLocaleTimeString()
}

function createEvent(event: Omit<ClientStrategyEvent, 'id' | 'time'>): ClientStrategyEvent {
  return {
    id: nextEventId(event.source === 'system' ? 'system' : event.source === 'operator' ? 'operator' : 'demo'),
    time: nowLabel(),
    source: 'system',
    ...event,
  }
}

const DEMO_EVENT_HISTORY_LIMIT = 64

function appendHistory(
  state: ClientDemoState,
  event: Omit<ClientStrategyEvent, 'id' | 'time'>,
  maxEvents = 5,
) {
  const nextEvent = createEvent(event)
  return {
    strategyEvents: [...state.strategyEvents.slice(-maxEvents), nextEvent],
    demoHistory: [...state.demoHistory.slice(-(DEMO_EVENT_HISTORY_LIMIT - 1)), nextEvent],
    activeStrategyEventId: nextEvent.id,
  }
}

const strategyTimeline: Array<
  Omit<ClientStrategyEvent, 'id' | 'time' | 'strategyPhase' | 'targetTab'> & {
    strategyPhase: ClientStrategyPhase
    targetTab: ClientDemoTab
    stepMs: number
  }
> = [
  {
    title: '采集实时工况',
    description: '检测泵组流量与主机负荷，计算当前运行裕度。',
    level: 'info',
    source: 'ai',
    strategyPhase: 'collect',
    targetTab: 'scene',
    stepMs: 800,
  },
  {
    title: '匹配控制策略',
    description: '基于设备可用性选择节能优先顺序，准备切换执行序列。',
    level: 'info',
    source: 'ai',
    strategyPhase: 'infer',
    targetTab: 'strategy',
    stepMs: 800,
  },
  {
    title: '下发执行策略',
    description: '向 CH2 与 P3 发送供回水调度建议，等待执行确认。',
    level: 'warn',
    source: 'ai',
    strategyPhase: 'dispatch',
    targetTab: 'scene',
    stepMs: 800,
  },
  {
    title: '策略回放与反馈',
    description: '关键指标回收口径开始回归，策略闭环效果可在报表观察。',
    level: 'info',
    source: 'system',
    strategyPhase: 'verify',
    targetTab: 'reports',
    stepMs: 900,
  },
]

const faultPlaybooks: Record<
  ClientFaultScenario,
  {
    startTitle: string
    startDescription: string
    stepTitle: string
    stepDescription: string
  }
> = {
  pump: {
    startTitle: '泵故障演练',
    startDescription: '模拟关键泵组压差异常：切入安全降负荷流程。',
    stepTitle: '泵组压差异常',
    stepDescription: '检测到 CH-2-PAK 振幅抖动，建议回退到手动保护分支。',
  },
  towerEfficiency: {
    startTitle: '冷却塔效率降级演练',
    startDescription: '模拟塔效下降，AI 调度触发备用散热策略。',
    stepTitle: '塔效回路告警',
    stepDescription: '冷却塔风机功耗上升，准备降载并切换部分旁路换热链路。',
  },
  condenserRise: {
    startTitle: '冷凝温升演练',
    startDescription: '模拟冷凝温升，触发温控优先级升高。',
    stepTitle: '冷凝器温升异常',
    stepDescription: '温升曲线异常波动，切换为稳态工况防抖并限制加速。',
  },
  manualFallback: {
    startTitle: '手动回退演练',
    startDescription: '演练策略中断，切换设备控制至手动优先。',
    stepTitle: '已切回人工控制',
    stepDescription: '系统策略动作暂停，进入人工保护链路并清理联动任务。',
  },
}

export type ClientDemoStoreState = ClientDemoState & ClientDemoActions

const createInitialState = (): ClientDemoState => ({
  currentSceneId: null,
  runningMode: 'auto',
  selectedSystem: 'all',
  selectedDeviceId: null,
  flowEnabled: true,
  aiStrategyStatus: 'idle',
  demoStage: 'overview',
  activeTab: 'overview',
  isDemoPlaying: false,
  activeStrategyPhase: 'idle',
  activeStrategyEventId: null,
  activeFaultScenario: null,
  strategyEvents: [
    {
      id: 'seed-boot',
      time: nowLabel(),
      title: '客户端视图已就绪',
      description: '默认进入只读客户端壳，等待策略演示或故障演练触发。',
      level: 'info',
      source: 'system',
      targetTab: 'overview',
      strategyPhase: 'idle',
    },
  ],
  demoHistory: [],
})

export const useClientDemoStore = create<ClientDemoStoreState>()((set) => ({
  ...createInitialState(),

  setCurrentSceneId: (currentSceneId) => {
    set({ currentSceneId })
  },

  setRunningMode: (runningMode) => {
    set({ runningMode })
  },

  setSelectedSystem: (selectedSystem) => {
    set({ selectedSystem })
  },

  setSelectedDeviceId: (selectedDeviceId) => {
    set({ selectedDeviceId })
  },

  setFlowEnabled: (flowEnabled) => {
    set({ flowEnabled })
  },

  setActiveTab: (activeTab) => {
    set({ activeTab })
  },

  setActiveStrategyPhase: (activeStrategyPhase) => {
    set({ activeStrategyPhase })
  },

  setActiveStrategyEventId: (activeStrategyEventId) => {
    set({ activeStrategyEventId })
  },

  setActiveFaultScenario: (activeFaultScenario) => {
    set({ activeFaultScenario })
  },

  addStrategyEvent: (event) =>
    set((state) => {
      const update = appendHistory(state, event)
      return {
        ...update,
        demoStage: event.targetTab ?? state.demoStage,
        activeTab: event.targetTab ?? state.activeTab,
      }
    }),

  playStrategyDemo: () => {
    clearDemoTimers()
    set((state) => {
      const startEvent = createEvent({
        title: '策略演示已启动',
        description: 'AI 优化策略开始执行，按阶段推进策略闭环节点。',
        level: 'info',
        source: 'operator',
        strategyPhase: 'collect',
        targetTab: 'strategy',
        system: '智能联动',
      })
      return {
        ...appendHistory(state, startEvent),
        aiStrategyStatus: 'running',
        demoStage: 'strategy',
        activeTab: 'strategy',
        isDemoPlaying: true,
        activeStrategyPhase: 'collect',
        runningMode: 'economy',
        activeFaultScenario: null,
      }
    })

    let currentOffset = 0
    strategyTimeline.forEach((step) => {
      currentOffset += step.stepMs
      const handle = setTimeout(() => {
        set((state) => {
          const nextEvent = createEvent({
            ...step,
            strategyPhase: step.strategyPhase,
            targetTab: step.targetTab,
          })
          return {
            ...appendHistory(state, nextEvent),
            aiStrategyStatus: 'running',
            demoStage: step.targetTab,
            activeTab: step.targetTab,
            isDemoPlaying: true,
            activeStrategyPhase: step.strategyPhase,
            runningMode: 'economy',
            activeFaultScenario: null,
          }
        })
      }, currentOffset)
      timerHandles.push(handle)
    })

    const doneHandle = setTimeout(() => {
      set((state) => {
        const doneEvent = createEvent({
          title: '策略演示完成',
          description: '演示闭环结束，系统返回监控待机状态。',
          level: 'info',
          source: 'system',
          strategyPhase: 'complete',
          targetTab: 'overview',
        })
        return {
          ...appendHistory(state, doneEvent, 5),
          aiStrategyStatus: 'idle',
          demoStage: 'overview',
          activeTab: 'overview',
          isDemoPlaying: false,
          activeStrategyPhase: 'complete',
          runningMode: 'auto',
        }
      })
    }, currentOffset + 1000)
    timerHandles.push(doneHandle)
  },

  runFaultScenario: (faultType = 'pump') => {
    clearDemoTimers()
    const plan = faultPlaybooks[faultType]
    set((state) => {
      const startEvent = createEvent({
        title: plan.startTitle,
        description: plan.startDescription,
        level: 'error',
        source: 'operator',
        strategyPhase: 'verify',
        targetTab: 'scene',
        faultType,
        system: '故障演练',
      })
      return {
        ...appendHistory(state, startEvent),
        aiStrategyStatus: 'fault',
        demoStage: 'scene',
        activeTab: 'scene',
        isDemoPlaying: true,
        activeStrategyPhase: 'verify',
        activeFaultScenario: faultType,
        runningMode: 'manual',
      }
    })

    const handle = setTimeout(() => {
      set((state) => {
        const nextEvent = createEvent({
          title: plan.stepTitle,
          description: plan.stepDescription,
          level: 'warn',
          source: 'system',
          strategyPhase: 'verify',
          targetTab: 'scene',
          faultType,
        })
        return {
          ...appendHistory(state, nextEvent),
          aiStrategyStatus: 'fault',
          demoStage: 'scene',
          activeTab: 'scene',
          isDemoPlaying: true,
          activeStrategyPhase: 'verify',
          activeFaultScenario: faultType,
        }
      })
    }, 750)
    timerHandles.push(handle)

    const resolveHandle = setTimeout(() => {
      set((state) => {
        const doneEvent = createEvent({
          title: '故障演练已恢复',
          description: '自动联动回退完成，系统切回待命态并清理临时策略。',
          level: 'info',
          source: 'system',
          strategyPhase: 'complete',
          targetTab: 'overview',
        })
        return {
          ...appendHistory(state, doneEvent),
          aiStrategyStatus: 'idle',
          demoStage: 'overview',
          activeTab: 'overview',
          isDemoPlaying: false,
          activeStrategyPhase: 'complete',
          activeFaultScenario: null,
          runningMode: 'auto',
        }
      })
    }, 4000)
    timerHandles.push(resolveHandle)
  },

  clearFaultScenario: () => {
    clearDemoTimers()
    set((state) => {
      const clearEvent = createEvent({
        title: '故障演练已清空',
        description: '恢复为默认运行态，策略页会回到当前监控状态。',
        level: 'info',
        source: 'operator',
        strategyPhase: 'complete',
      })
      return {
        ...appendHistory(state, clearEvent),
        aiStrategyStatus: 'idle',
        demoStage: 'overview',
        isDemoPlaying: false,
        activeStrategyPhase: 'idle',
        activeFaultScenario: null,
        runningMode: 'auto',
      }
    })
  },

  clearEvents: () => {
    set({
      strategyEvents: [],
      demoHistory: [],
      activeStrategyEventId: null,
      aiStrategyStatus: 'idle',
      activeStrategyPhase: 'idle',
      activeFaultScenario: null,
      isDemoPlaying: false,
      demoStage: 'overview',
      activeTab: 'overview',
      runningMode: 'auto',
    })
  },
}))
