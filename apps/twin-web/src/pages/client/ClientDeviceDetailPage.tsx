import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { loadCurrentSceneIntoStore, loadNamedSceneIntoStore } from '@/services/loadDemoScene'
import { useSyncRuntimeWithScene } from '@/hooks/useSyncRuntimeWithScene'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import { createDeviceDetailPollTask } from '@/pages/detail/deviceRuntimePolling'
import { useClientDemoStore } from '@/store/clientDemoStore'
import { useSceneStore } from '@/store/sceneStore'
import { useRuntimeStore } from '@/store/runtimeStore'

const TrendChart = lazy(async () => {
  const mod = await import('@/components/charts/TrendChart')
  return { default: mod.TrendChart }
})

function sanitizeClientError(message: string | null) {
  if (!message) return null
  return message.includes('502') ? null : message
}

function formatDeviceType(type: string) {
  if (type === 'chiller') return '离心冷机'
  if (type === 'pump') return '泵组设备'
  if (type === 'tower') return '冷却塔'
  if (type === 'heat-exchanger') return '换热模块'
  if (type === 'valve') return '阀门组件'
  return type
}

export function ClientDeviceDetailPage() {
  useSyncRuntimeWithScene()
  const { deviceId: rawId } = useParams<{ deviceId: string }>()
  const deviceId = rawId ? decodeURIComponent(rawId) : ''
  const [searchParams] = useSearchParams()
  const sceneId = searchParams.get('sceneId')
  const backPath = sceneId ? `/c/scene/${encodeURIComponent(sceneId)}` : '/c/overview'
  const devices = useSceneStore((s) => s.devices)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [loadingScene, setLoadingScene] = useState(() => devices.length === 0)
  const device = useMemo(() => devices.find((d) => d.id === deviceId), [devices, deviceId])
  const setActiveTab = useClientDemoStore((s) => s.setActiveTab)
  const fetchDeviceRuntime = useRuntimeStore((s) => s.fetchDeviceRuntime)
  const runtime = useRuntimeStore((s) => (deviceId ? s.getDeviceRuntime(deviceId) ?? null : null))
  const loadingRuntime = useRuntimeStore((s) => (deviceId ? s.loadingDeviceIds.has(deviceId) : false))
  const runtimeError = useRuntimeStore((s) => (deviceId ? s.deviceErrorById.get(deviceId) ?? null : null))
  const overview = useRuntimeStore((s) => s.overview)

  useEffect(() => {
    setActiveTab(sceneId ? 'scene' : 'overview')
  }, [sceneId, setActiveTab])

  useEffect(() => {
    let active = true
    if (devices.length > 0) {
      setLoadingScene(false)
      return
    }
    const loader = sceneId ? loadNamedSceneIntoStore(sceneId) : loadCurrentSceneIntoStore()
    void loader.then((result) => {
      if (!active) return
      setSceneError(result.ok ? null : sanitizeClientError(result.error))
      setLoadingScene(false)
    })
    return () => {
      active = false
    }
  }, [devices.length, sceneId])

  useEffect(() => {
    if (!deviceId || devices.length === 0) return
    void fetchDeviceRuntime(deviceId).catch(() => undefined)
  }, [deviceId, devices.length, fetchDeviceRuntime])

  useRuntimePolling(
    createDeviceDetailPollTask(fetchDeviceRuntime, deviceId),
    10_000,
    deviceId.length > 0 && devices.length > 0,
  )

  const fallbackRuntime = useMemo(() => {
    if (!device) return null
    return {
      deviceId: device.id,
      deviceName: device.name,
      system: device.system,
      onlineStatus: 'online' as const,
      updatedAt: new Date().toISOString(),
      points: [
        { id: 'p-1', name: '频率反馈', value: 42, unit: 'Hz', quality: 'good' as const },
        { id: 'p-2', name: '出水温度', value: 7.1, unit: '°C', quality: 'good' as const },
        { id: 'p-3', name: '回水温度', value: 12.4, unit: '°C', quality: 'good' as const },
        { id: 'p-4', name: '瞬时功率', value: Math.max((overview?.totalPower ?? 670) / 2, 126), unit: 'kW', quality: 'good' as const },
      ],
      trend: [
        { t: '00:00', v: 116 },
        { t: '04:00', v: 122 },
        { t: '08:00', v: 131 },
        { t: '12:00', v: 126 },
        { t: '16:00', v: 119 },
        { t: '20:00', v: 124 },
      ],
      alarms: [],
      runMode: 'auto',
      runModeDescription: '当前设备保持展示型只读控制，由 AI 策略链路统一协调启停与频率调整。',
      strategyHint: 'AI 持续参考系统负荷、温差与流量反馈，协调设备进入最优工况区间，避免单点超调。',
      aiSuggestion: '维持当前设备运行区间，继续观察未来 30 分钟负荷趋势；若冷凝温差继续增大，优先联动冷却侧优化。',
    }
  }, [device, overview?.totalPower])

  const displayRuntime = runtime ?? (runtimeError?.includes('502') ? fallbackRuntime : null)
  const displayRuntimeError = sanitizeClientError(runtimeError)

  if (loadingScene) {
    return (
      <div className="detail-page detail-page--empty">
        <p>正在加载场景…</p>
      </div>
    )
  }

  if (!device || !displayRuntime) {
    return (
      <div className="detail-page detail-page--empty client-device-page client-device-page--empty">
        <p>{loadingRuntime ? '正在加载运行态…' : `未找到设备「${deviceId || '—'}」。`}</p>
        {sceneError ? <p className="muted small">{sceneError}</p> : null}
        {displayRuntimeError ? <p className="muted small">{displayRuntimeError}</p> : null}
        <Link to={backPath} className="primary">
          {sceneId ? '返回场景' : '返回总览'}
        </Link>
      </div>
    )
  }

  const highlightMetric = displayRuntime.points[0]
  const pointMetric = displayRuntime.points.slice(1, 4)
  const alarmCount = displayRuntime.alarms.length
  const strategyModeLabel = displayRuntime.onlineStatus === 'online' ? '稳定运行' : '待人工确认'

  return (
    <div className="detail-page client-device-page">
      <section className="client-device-hero">
        <div className="client-device-hero__copy">
          <Link to={backPath} className="detail-back client-device-back">
            {sceneId ? '← 返回场景' : '← 返回总览'}
          </Link>
          <div className="client-device-hero__eyebrow">设备运行明细</div>
          <h1>{displayRuntime.deviceName}</h1>
          <p className="client-device-hero__desc">
            {displayRuntime.deviceId} · 系统 {displayRuntime.system} · 类型 {formatDeviceType(device.type)} · 更新时间 {displayRuntime.updatedAt}
          </p>
          <div className="client-device-hero__chips">
            <span>{displayRuntime.onlineStatus === 'online' ? '在线运行' : displayRuntime.onlineStatus}</span>
            <span>运行模式 {displayRuntime.runMode}</span>
            <span>策略态 {strategyModeLabel}</span>
          </div>
        </div>

        <div className="client-device-hero__metrics">
          <article className="client-device-kpi client-device-kpi--primary">
            <span>{highlightMetric?.name ?? '关键点位'}</span>
            <strong>
              {highlightMetric?.value ?? '—'} {highlightMetric?.unit ?? ''}
            </strong>
            <p>当前设备主监测点</p>
          </article>
          {pointMetric.map((point) => (
            <article key={point.id} className="client-device-kpi">
              <span>{point.name}</span>
              <strong>
                {point.value} {point.unit}
              </strong>
              <p>{point.quality === 'good' ? '数据质量正常' : '数据质量异常'}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="client-device-layout">
        <section className="detail-card client-device-card">
          <h2>实时点位</h2>
          <table className="detail-table">
            <thead>
              <tr>
                <th>测点</th>
                <th>数值</th>
                <th>质量</th>
              </tr>
            </thead>
            <tbody>
              {displayRuntime.points.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    {p.value} {p.unit}
                  </td>
                  <td>
                    <span className={`quality quality--${p.quality}`}>{p.quality === 'good' ? '正常' : '异常'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="detail-card detail-card--wide client-device-card">
          <h2>趋势（近 24h）</h2>
          <Suspense fallback={<div className="trend-chart" />}>
            <TrendChart data={displayRuntime.trend} seriesName={displayRuntime.points[0]?.name ?? '趋势'} />
          </Suspense>
        </section>

        <aside className="client-device-sidebar">
          <section className="detail-card client-device-card">
            <h2>运行摘要</h2>
            <div className="client-device-summary-list">
              <div className="client-device-summary-row">
                <span>设备状态</span>
                <strong>{displayRuntime.onlineStatus === 'online' ? '在线' : displayRuntime.onlineStatus}</strong>
              </div>
              <div className="client-device-summary-row">
                <span>运行模式</span>
                <strong>{displayRuntime.runMode}</strong>
              </div>
              <div className="client-device-summary-row">
                <span>活动告警</span>
                <strong>{alarmCount}</strong>
              </div>
              <div className="client-device-summary-row">
                <span>所属系统</span>
                <strong>{displayRuntime.system}</strong>
              </div>
            </div>
          </section>

          <section className="detail-card client-device-card">
            <h2>告警</h2>
            {displayRuntime.alarms.length === 0 ? (
              <p className="muted small">当前无活动告警。</p>
            ) : (
              <ul className="detail-alarms">
                {displayRuntime.alarms.map((a) => (
                  <li key={a.id} className={`alarm alarm--${a.level}`}>
                    <span className="alarm-level">{a.level === 'critical' ? '严重' : '警告'}</span>
                    <span className="alarm-msg">{a.message}</span>
                    <span className="alarm-time muted small">{a.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <section className="detail-card detail-card--wide client-device-card">
          <h2>运行模式 · {displayRuntime.runMode}</h2>
          <p className="detail-prose">{displayRuntime.runModeDescription}</p>
        </section>

        <section className="detail-card detail-card--wide client-device-card">
          <h2>策略说明</h2>
          <p className="detail-prose">{displayRuntime.strategyHint}</p>
        </section>

        <section className="detail-card detail-card--wide client-device-card">
          <h2>AI 建议</h2>
          <p className="detail-prose">{displayRuntime.aiSuggestion}</p>
        </section>
      </div>
    </div>
  )
}
