import { lazy, Suspense, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMockDeviceRuntime } from '@/services/mockDeviceRuntime'
import { useSceneStore } from '@/store/sceneStore'

const TrendChart = lazy(async () => {
  const mod = await import('@/components/charts/TrendChart')
  return { default: mod.TrendChart }
})

export function DeviceDetailPage() {
  const { deviceId: rawId } = useParams<{ deviceId: string }>()
  const deviceId = rawId ? decodeURIComponent(rawId) : ''
  const devices = useSceneStore((s) => s.devices)
  const device = useMemo(() => devices.find((d) => d.id === deviceId), [devices, deviceId])

  const runtime = useMemo(() => (device ? getMockDeviceRuntime(device) : null), [device])

  if (!device || !runtime) {
    return (
      <div className="detail-page detail-page--empty">
        <p>未找到设备「{deviceId || '—'}」。</p>
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
            {runtime.deviceId} · 系统 {runtime.system} · Mock 数据
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
          <h2>趋势（近 24h，Mock）</h2>
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
