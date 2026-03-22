import type { Device } from '@/schemas/device'
import type { DeviceRuntimeMock, TrendSample } from '@/schemas/deviceRuntime'

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function buildTrend(seed: number, base: number): TrendSample[] {
  const out: TrendSample[] = []
  for (let i = 23; i >= 0; i--) {
    const hour = String(23 - i).padStart(2, '0')
    const noise = Math.sin(seed * 0.01 + i * 0.4) * (base * 0.04)
    out.push({ t: `${hour}:00`, v: Math.round((base + noise) * 10) / 10 })
  }
  return out
}

export function getMockDeviceRuntime(device: Device): DeviceRuntimeMock {
  const seed = hashId(device.id)
  const isChiller = device.type === 'chiller'

  const baseTemp = isChiller ? 7.2 + (seed % 10) * 0.08 : 12 + (seed % 8) * 0.1
  const power = isChiller ? 420 + (seed % 80) : 55 + (seed % 15)

  const points = isChiller
    ? [
        { id: 'temp_out', name: '冷冻供水温度', value: baseTemp, unit: '°C', quality: 'good' as const },
        { id: 'temp_in', name: '冷冻回水温度', value: baseTemp + 4.2, unit: '°C', quality: 'good' as const },
        { id: 'power', name: '实时功率', value: power, unit: 'kW', quality: 'good' as const },
        { id: 'cop', name: '瞬时 COP', value: 5.1 + (seed % 20) * 0.01, unit: '', quality: 'good' as const },
      ]
    : [
        { id: 'freq', name: '变频器频率', value: 42 + (seed % 12), unit: 'Hz', quality: 'good' as const },
        { id: 'flow', name: '估算流量', value: 180 + (seed % 25), unit: 'm³/h', quality: 'good' as const },
        { id: 'power', name: '泵功率', value: power, unit: 'kW', quality: 'good' as const },
      ]

  const alarms =
    seed % 7 === 0
      ? [
          {
            id: 'A-MOCK-1',
            level: 'warning' as const,
            message: '冷却侧温差偏小，建议检查塔风机联动（演示数据）',
            time: '今日 09:12',
          },
        ]
      : []

  return {
    deviceId: device.id,
    deviceName: device.name,
    system: device.system,
    points,
    trend: buildTrend(seed, isChiller ? baseTemp : power),
    alarms,
    runMode: 'AI_OPT',
    runModeDescription:
      '当前处于 AI 节能优化模式：在满足末端舒适与设备约束前提下，自动寻优冷水机组与泵组组合。以下为策略说明摘要（Mock）。',
    strategyHint:
      '策略版本 v1.0.0：优先保证供水温度带内运行；负荷预测每 15min 刷新；大机启停与泵变频联动由上层优化器下发建议，经人工或规则确认后执行。',
    aiSuggestion:
      '根据过去 24h 负荷曲线，建议在 14:00–18:00 区间预降供水设定 0.3°C 以平滑峰值功率；现场请以实际点表与联锁为准（演示文案）。',
  }
}
