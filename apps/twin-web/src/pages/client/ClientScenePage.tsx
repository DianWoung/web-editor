import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { SceneSubspaceShell } from '@/components/layout/SceneSubspaceShell'
import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
import { ClientDemoStatusBar } from '@/components/layout/ClientDemoStatusBar'
import { ViewerCanvas } from '@/components/scene/ViewerCanvas'
import { loadEquipmentCatalog, type RenderStyle } from '@/services/loadEquipmentCatalog'
import { listNamedScenes, loadCurrentSceneIntoStore, loadNamedSceneIntoStore } from '@/services/loadDemoScene'
import type { SceneLibraryItem } from '@/schemas/scene'
import { useClientDemoStore } from '@/store/clientDemoStore'
import type { DeviceRuntime } from '@/schemas/deviceRuntime'
import { useSceneStore } from '@/store/sceneStore'
import { useRuntimeStore } from '@/store/runtimeStore'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import { useSyncRuntimeWithScene } from '@/hooks/useSyncRuntimeWithScene'

function sanitizeClientError(message: string | null) {
  if (!message) return null
  return message.includes('502') ? null : message
}

function calculateSystemAlarmCount(
  runtimes: Map<string, DeviceRuntime>,
  deviceIds: Set<string>,
): number {
  return Array.from(runtimes.entries()).reduce((sum, [id, runtime]) => {
    if (!deviceIds.has(id)) return sum
    return sum + runtime.alarms.length
  }, 0)
}

export function ClientScenePage() {
  const { sceneId } = useParams<{ sceneId: string }>()
  useSyncRuntimeWithScene()
  const navigate = useNavigate()
  const [resetViewNonce, setResetViewNonce] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [sceneMeta, setSceneMeta] = useState<SceneLibraryItem | null>(null)
  const [sceneItems, setSceneItems] = useState<SceneLibraryItem[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const flowEnabled = useClientDemoStore((s) => s.flowEnabled)
  const setFlowEnabled = useClientDemoStore((s) => s.setFlowEnabled)
  const runningMode = useClientDemoStore((s) => s.runningMode)
  const setRunningMode = useClientDemoStore((s) => s.setRunningMode)
  const selectedSystem = useClientDemoStore((s) => s.selectedSystem)
  const setSelectedSystem = useClientDemoStore((s) => s.setSelectedSystem)
  const selectedDeviceId = useClientDemoStore((s) => s.selectedDeviceId)
  const setSelectedDeviceId = useClientDemoStore((s) => s.setSelectedDeviceId)
  const currentSceneId = useClientDemoStore((s) => s.currentSceneId)
  const setCurrentSceneId = useClientDemoStore((s) => s.setCurrentSceneId)
  const strategyEvents = useClientDemoStore((s) => s.strategyEvents)
  const setActiveTab = useClientDemoStore((s) => s.setActiveTab)
  const activeFaultScenario = useClientDemoStore((s) => s.activeFaultScenario)
  const aiStrategyStatus = useClientDemoStore((s) => s.aiStrategyStatus)
  const playStrategyDemo = useClientDemoStore((s) => s.playStrategyDemo)
  const runFaultScenario = useClientDemoStore((s) => s.runFaultScenario)
  const clearFaultScenario = useClientDemoStore((s) => s.clearFaultScenario)

  const deviceCount = useSceneStore((s) => s.devices.length)
  const totalPower = useRuntimeStore((s) => s.totalPower)
  const avgCop = useRuntimeStore((s) => s.avgCop)
  const activeAlarmCount = useRuntimeStore((s) => s.activeAlarmCount)
  const lastUpdatedAt = useRuntimeStore((s) => s.lastUpdatedAt)
  const loadingOverview = useRuntimeStore((s) => s.loadingOverview)
  const overviewError = useRuntimeStore((s) => s.overviewError)
  const fetchOverview = useRuntimeStore((s) => s.fetchOverview)
  const runtimes = useRuntimeStore((s) => s.deviceRuntimeById)
  const devices = useSceneStore((s) => s.devices)

  useEffect(() => {
    let active = true
    loadEquipmentCatalog()
      .then((items) => {
        if (!active) return
        setCatalog(items)
        setCatalogError(null)
      })
      .catch((error) => {
        if (!active) return
        setCatalog([])
        setCatalogError(sanitizeClientError(error instanceof Error ? error.message : String(error)))
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoadingList(true)
      try {
        const listResult = await listNamedScenes()
        if (!active) return
        if (listResult.ok) {
          setSceneItems(listResult.data.items)
          if (!sceneId && listResult.data.items.length > 0) {
            const targetSceneId = currentSceneId ?? listResult.data.items[0].id
            setCurrentSceneId(targetSceneId)
          }
        }
      } finally {
        if (active) setLoadingList(false)
      }
    })()
    return () => {
      active = false
    }
  }, [currentSceneId, sceneId, setCurrentSceneId])

  useEffect(() => {
    let active = true
    const targetSceneId = sceneId ?? currentSceneId ?? null
    if (!targetSceneId && useSceneStore.getState().devices.length > 0) return
    const loader = targetSceneId ? loadNamedSceneIntoStore(targetSceneId) : loadCurrentSceneIntoStore()
    void loader.then((result) => {
      if (!active) return
      setSceneError(result.ok ? null : sanitizeClientError(result.error))
    })
    return () => {
      active = false
    }
  }, [currentSceneId, sceneId])

  useEffect(() => {
    let active = true
    const targetSceneId = sceneId ?? currentSceneId
    setCurrentSceneId(targetSceneId ?? null)
    if (!targetSceneId) {
      setSceneMeta(null)
      return () => {
        active = false
      }
    }
    void (async () => {
      if (!targetSceneId) return
      const result = await listNamedScenes()
      if (!active) return
      if (result.ok) {
        setSceneMeta(result.data.items.find((item) => item.id === targetSceneId) ?? null)
      }
    })()
    return () => {
      active = false
    }
  }, [currentSceneId, sceneId, setCurrentSceneId])

  useRuntimePolling(async () => {
    await fetchOverview()
  }, 10_000, deviceCount > 0)

  useEffect(() => {
    if (deviceCount <= 0) return
    void fetchOverview()
  }, [deviceCount, fetchOverview])

  useEffect(() => {
    setActiveTab('scene')
  }, [setActiveTab])

  const systems = useMemo(
    () => ['all', ...Array.from(new Set(devices.map((device) => device.system)))],
    [devices],
  )

  useEffect(() => {
    if (!systems.includes(selectedSystem)) {
      setSelectedSystem('all')
    }
  }, [selectedSystem, setSelectedSystem, systems])

  const filteredDeviceIds = useMemo(
    () => new Set(selectedSystem === 'all' ? devices.map((device) => device.id) : devices.filter((device) => device.system === selectedSystem).map((device) => device.id)),
    [devices, selectedSystem],
  )

  const filteredDeviceCount = filteredDeviceIds.size
  const filteredAlarmCount = calculateSystemAlarmCount(runtimes, filteredDeviceIds)

  const modelUrlByAssetId = useMemo(() => {
    const m: Record<string, string | null | undefined> = {}
    catalog?.forEach((item) => {
      m[item.assetId] = item.modelGlbUrl ?? (item.modelGlb ? `/equipment/${item.assetId}/model.glb` : null)
    })
    return m
  }, [catalog])

  const renderStyleByAssetId = useMemo(() => {
    const m: Record<string, RenderStyle | undefined> = {}
    catalog?.forEach((item) => {
      m[item.assetId] = item.renderStyle ?? 'box'
    })
    return m
  }, [catalog])

  const resolvedSceneId = sceneId ?? currentSceneId ?? null
  const currentSceneMeta =
    sceneMeta?.id === resolvedSceneId ? sceneMeta : sceneItems.find((item) => item.id === resolvedSceneId) ?? null
  const recentEvents = strategyEvents.slice(-4).reverse()
  const sceneStatusLabel = activeAlarmCount > 0 ? '保护监测中' : 'AI 优化监测中'
  const strategySummary =
    aiStrategyStatus === 'fault'
      ? '当前存在异常演练，控制链路已切入保守模式，等待人工确认恢复。'
      : 'AI 根据实时负荷、冷凝温差与系统告警协同调整主机、泵组和冷却塔频率。'
  const strategyFocus =
    recentEvents[0]?.description ?? '当前展示基线运行状态，可随时播放策略演示或触发故障演练。'
  const sceneSystemSummary = systems
    .filter((system) => system !== 'all')
    .slice(0, 4)
    .map((system) => ({
      label: system,
      count: devices.filter((device) => device.system === system).length,
    }))

  const handleOpenDevice = (deviceId: string) => {
    const targetSceneId = sceneId ?? currentSceneId
    setSelectedDeviceId(deviceId)
    if (!targetSceneId) {
      navigate(`/c/device/${encodeURIComponent(deviceId)}`)
      return
    }
    navigate(`/c/device/${encodeURIComponent(deviceId)}?sceneId=${encodeURIComponent(targetSceneId)}`)
  }

  const sceneOverviewPanel = (
    <aside className="client-scene-panel-stack">
      <section className="scene-summary-card">
        <div className="client-scene-panel__eyebrow">运行摘要</div>
        <h2>机房运行概览</h2>
        <div className="scenes-runtime-grid">
          <article className="scenes-runtime-metric">
            <span className="scenes-runtime-metric__label">在线设备</span>
            <strong>{filteredDeviceCount}</strong>
          </article>
          <article className="scenes-runtime-metric">
            <span className="scenes-runtime-metric__label">系统告警</span>
            <strong>{filteredAlarmCount}</strong>
          </article>
          <article className="scenes-runtime-metric">
            <span className="scenes-runtime-metric__label">总功率</span>
            <strong>{totalPower.toFixed(1)} kW</strong>
          </article>
          <article className="scenes-runtime-metric">
            <span className="scenes-runtime-metric__label">业务指标</span>
            <strong>{avgCop.toFixed(2)}</strong>
          </article>
          <article className="scenes-runtime-metric">
            <span className="scenes-runtime-metric__label">活动告警</span>
            <strong>{activeAlarmCount}</strong>
          </article>
          <article className="scenes-runtime-metric">
            <span className="scenes-runtime-metric__label">AI 优化状态</span>
            <strong>{sceneStatusLabel}</strong>
          </article>
        </div>
        <p className="muted small">运行态更新时间：{lastUpdatedAt ?? '—'}</p>
        {loadingOverview ? <p className="muted small">运行态加载中…</p> : null}
        {loadingList ? <p className="muted small">正在加载场景列表…</p> : null}
      </section>

      <section className="scene-summary-card">
        <div className="client-scene-panel__eyebrow">系统分区</div>
        <h2>设备运行分布</h2>
        <div className="client-scene-system-list">
          {sceneSystemSummary.length === 0 ? <p className="toolbar-hint">当前场景暂无系统分组信息。</p> : null}
          {sceneSystemSummary.map((entry) => (
            <div key={entry.label} className="client-scene-system-row">
              <span>{entry.label}</span>
              <strong>{entry.count} 台</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="scene-summary-card">
        <div className="client-scene-panel__eyebrow">运行控制</div>
        <h2>视图与过滤</h2>
        <label className="toolbar-field">
          <span className="toolbar-field-label">运行模式</span>
          <select
            className="toolbar-select"
            value={runningMode}
            onChange={(event) => setRunningMode(event.target.value as 'auto' | 'economy' | 'comfort' | 'manual')}
          >
            <option value="auto">AI 自动</option>
            <option value="economy">节能优先</option>
            <option value="comfort">舒适优先</option>
            <option value="manual">手动保护</option>
          </select>
        </label>
        <label className="toolbar-field">
          <span className="toolbar-field-label">系统过滤</span>
          <select className="toolbar-select" value={selectedSystem} onChange={(event) => setSelectedSystem(event.target.value)}>
            {systems.map((system) => (
              <option key={system} value={system}>
                {system === 'all' ? '全部系统' : system}
              </option>
            ))}
          </select>
        </label>
        <label className="scene-preview-toggle">
          <input type="checkbox" checked={flowEnabled} onChange={(event) => setFlowEnabled(event.target.checked)} aria-label="管道流动模式" />
          <span>开启流动动画</span>
        </label>
        <p className="muted small">当前选中设备：{selectedDeviceId ?? '未选中'}</p>
      </section>
    </aside>
  )

  const sceneStrategyPanel = (
    <aside className="client-scene-panel-stack">
      <section className="scene-summary-card">
        <div className="client-scene-panel__eyebrow">策略说明</div>
        <h2>当前 AI 节能逻辑</h2>
        <p className="client-scene-panel__lead">{strategySummary}</p>
      </section>

      <section className="scene-summary-card scene-summary-card--accent">
        <div className="client-scene-panel__eyebrow">当前策略</div>
        <h2>负荷平稳跟踪</h2>
        <p className="client-scene-panel__lead">
          当前保持 {runningMode === 'manual' ? '人工保护' : '主机、泵组与冷却塔联动控制'}，在满足出水温约束的前提下压缩单位冷量能耗。
        </p>
      </section>

      <section className="scene-summary-card">
        <div className="client-scene-panel__eyebrow">演示焦点</div>
        <h2>{recentEvents[0]?.title ?? '系统处于演示待命'}</h2>
        <p className="client-scene-panel__lead">{strategyFocus}</p>
      </section>

      <section className="scene-summary-card">
        <div className="client-scene-panel__eyebrow">策略动作</div>
        <h2>演示与故障演练</h2>
        <div className="toolbar-row">
          <button type="button" className="secondary" onClick={playStrategyDemo}>
            播放策略演示
          </button>
          <button type="button" className="secondary danger-outline" onClick={() => runFaultScenario('pump')}>
            演练：泵故障
          </button>
          <button type="button" className="secondary danger-outline" onClick={() => runFaultScenario('towerEfficiency')}>
            演练：塔效降级
          </button>
          <button type="button" className="secondary danger-outline" onClick={() => runFaultScenario('condenserRise')}>
            演练：冷凝温升
          </button>
          <button type="button" className="secondary danger-outline" onClick={() => runFaultScenario('manualFallback')}>
            演练：手动回退
          </button>
          <button type="button" className="secondary" onClick={clearFaultScenario}>
            清空故障
          </button>
        </div>
        {activeFaultScenario ? <p className="toolbar-hint">当前演练：{activeFaultScenario}</p> : null}
        {aiStrategyStatus === 'running' ? <p className="toolbar-hint">策略演示运行中，可在控制流程页查看阶段明细。</p> : null}
      </section>

      <section className="scene-summary-card">
        <div className="client-scene-panel__eyebrow">策略事件</div>
        <h2>最近事件流</h2>
        {recentEvents.length === 0 ? <p className="toolbar-hint">尚未触发策略流程。</p> : null}
        {recentEvents.map((event) => (
          <div key={event.id} className={`client-event-item client-event-item--${event.level}`}>
            <strong>{event.title}</strong>
            <p className="muted small">{event.description}</p>
            <span className="toolbar-hint">{event.time}</span>
          </div>
        ))}
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
    </aside>
  )

  return (
    <SceneSubspaceShell
      className="client-scene-page"
      bodyClassName="scene-subspace__body--top client-scene-body"
      header={
        <SceneWorkspaceHeader
          eyebrow="客户场景运行态"
          title={currentSceneMeta?.name ?? '场景运行视图'}
          description={currentSceneMeta?.remark || '围绕当前场景承接运行摘要、业务指标与设备详情跳转。'}
          children={<ClientDemoStatusBar />}
          actions={
            <>
              <Link className="secondary scene-link-button" to="/c/overview">
                返回总览
              </Link>
              <Link className="secondary scene-link-button" to="/c/strategy">
                打开控制流程
              </Link>
              <Link className="secondary scene-link-button" to="/c/reports">
                打开报表
              </Link>
              <button type="button" className="secondary" onClick={() => setResetViewNonce((value) => value + 1)}>
                重置视角
              </button>
            </>
          }
        />
      }
      stage={
        <div className="client-scene-layout">
          {sceneOverviewPanel}

          <section className="client-scene-center">
            <div className="client-scene-canvas">
              <div className="client-scene-canvas__badges">
                <span className="client-scene-badge client-scene-badge--accent">
                  {currentSceneMeta?.name ?? '当前场景'}
                </span>
                <span className="client-scene-badge">模式 · {runningMode}</span>
                <span className="client-scene-badge">设备 · {filteredDeviceCount}</span>
                <span className="client-scene-badge">告警 · {filteredAlarmCount}</span>
              </div>
              <div className="client-scene-canvas__actions">
                <button type="button" className="secondary client-scene-drawer-toggle" onClick={() => setDrawerOpen((open) => !open)}>
                  {drawerOpen ? '收起面板' : '打开面板'}
                </button>
                <button type="button" className="secondary" onClick={() => setResetViewNonce((value) => value + 1)}>
                  重置视角
                </button>
              </div>
              {catalog === null ? <p className="overview-hint">正在加载设备目录…</p> : null}
              <ViewerCanvas
                modelUrlByAssetId={modelUrlByAssetId}
                renderStyleByAssetId={renderStyleByAssetId}
                flowEnabled={flowEnabled}
                resetViewNonce={resetViewNonce}
                onOpenDevice={handleOpenDevice}
              />
              <div className="overview-hint">
                点击设备进入运行明细（只读）{selectedSystem !== 'all' ? ` · 当前系统：${selectedSystem}` : ''}
              </div>
            </div>

            <div className="client-scene-footer-strip">
              <span>当前策略：负荷平稳跟踪</span>
              <span>筛选：{selectedSystem === 'all' ? '全部设备' : selectedSystem}</span>
              <span>运行模式：{runningMode}</span>
            </div>
          </section>

          {sceneStrategyPanel}

          <div className={`client-scene-drawer${drawerOpen ? ' client-scene-drawer--open' : ''}`}>
            <div className="client-scene-drawer__header">
              <div>
                <strong>场景运行面板</strong>
                <p className="toolbar-hint">小屏设备使用抽屉查看运行摘要与策略说明。</p>
              </div>
              <button type="button" className="secondary" onClick={() => setDrawerOpen(false)}>
                收起
              </button>
            </div>
            {sceneOverviewPanel}
            {sceneStrategyPanel}
          </div>
        </div>
      }
      stageClassName="scene-subspace__stage--runtime client-scene-stage"
    />
  )
}
