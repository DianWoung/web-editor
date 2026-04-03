import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadCurrentSceneIntoStore } from '@/services/loadDemoScene'
import { useSyncRuntimeWithScene } from '@/hooks/useSyncRuntimeWithScene'
import { useRuntimePolling } from '@/hooks/useRuntimePolling'
import { createDeviceDetailPollTask } from '@/pages/detail/deviceRuntimePolling'
import { useSceneStore } from '@/store/sceneStore'
import { useRuntimeStore } from '@/store/runtimeStore'

const TrendChart = lazy(async () => {
  const mod = await import('@/components/charts/TrendChart')
  return { default: mod.TrendChart }
})

export function DeviceDetailPage() {
  useSyncRuntimeWithScene()
  const { deviceId: rawId } = useParams<{ deviceId: string }>()
  const deviceId = rawId ? decodeURIComponent(rawId) : ''
  const devices = useSceneStore((s) => s.devices)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [loadingScene, setLoadingScene] = useState(() => devices.length === 0)
  const device = useMemo(() => devices.find((d) => d.id === deviceId), [devices, deviceId])
  const fetchDeviceRuntime = useRuntimeStore((s) => s.fetchDeviceRuntime)
  const runtime = useRuntimeStore((s) => (deviceId ? s.getDeviceRuntime(deviceId) ?? null : null))
  const loadingRuntime = useRuntimeStore((s) => (deviceId ? s.loadingDeviceIds.has(deviceId) : false))
  const runtimeError = useRuntimeStore((s) => (deviceId ? s.deviceErrorById.get(deviceId) ?? null : null))

  useEffect(() => {
    let active = true
    if (devices.length > 0) return
    void loadCurrentSceneIntoStore().then((result) => {
      if (!active) return
      setSceneError(result.ok ? null : result.error)
      setLoadingScene(false)
    })
    return () => {
      active = false
    }
  }, [devices.length])

  useRuntimePolling(createDeviceDetailPollTask(fetchDeviceRuntime, deviceId), 10_000, deviceId.length > 0 && devices.length > 0)

  if (loadingScene) {
    return (
      <div className="detail-page detail-page--empty">
        <p>正在加载场景…</p>
      </div>
    )
  }

  if (!device || !runtime) {
    return (
      <div className="detail-page detail-page--empty">
        <p>{loadingRuntime ? '正在加载运行态…' : `未找到设备「${deviceId || '—'}」。`}</p>
        {sceneError ? <p className="muted small">{sceneError}</p> : null}
        {runtimeError ? <p className="muted small">{runtimeError}</p> : null}
        <Link to="/overview" className="primary">
          返回总览
        </Link>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <header className="detail-header">
        <Link to="/overview" className="detail-back">
          ← 三维总览
        </Link>
        <div>
          <h1>{runtime.deviceName}</h1>
          <p className="muted small">
            {runtime.deviceId} · 系统 {runtime.system} · 状态 {runtime.onlineStatus} · 更新时间 {runtime.updatedAt}
          </p>
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-card">
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
              {runtime.points.map((p) => (
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

        <section className="detail-card detail-card--wide">
          <h2>趋势（近 24h）</h2>
          <Suspense fallback={<div className="trend-chart" />}>
            <TrendChart data={runtime.trend} seriesName={runtime.points[0]?.name ?? '趋势'} />
          </Suspense>
        </section>

        <section className="detail-card">
          <h2>告警</h2>
          {runtime.alarms.length === 0 ? (
            <p className="muted small">当前无活动告警。</p>
          ) : (
            <ul className="detail-alarms">
              {runtime.alarms.map((a) => (
                <li key={a.id} className={`alarm alarm--${a.level}`}>
                  <span className="alarm-level">{a.level === 'critical' ? '严重' : '警告'}</span>
                  <span className="alarm-msg">{a.message}</span>
                  <span className="alarm-time muted small">{a.time}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="detail-card detail-card--wide">
          <h2>运行模式 · {runtime.runMode}</h2>
          <p className="detail-prose">{runtime.runModeDescription}</p>
        </section>

        <section className="detail-card detail-card--wide">
          <h2>策略说明</h2>
          <p className="detail-prose">{runtime.strategyHint}</p>
        </section>

        <section className="detail-card detail-card--wide">
          <h2>AI 建议</h2>
          <p className="detail-prose">{runtime.aiSuggestion}</p>
        </section>
      </div>
    </div>
  )
}
