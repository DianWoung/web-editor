import { z } from 'zod'

import type { DeviceRuntime, RuntimeOverview } from '../../schemas/deviceRuntime.ts'

const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

const runtimeOverviewSchema = z.object({
  totalPower: z.number(),
  avgCop: z.number(),
  activeAlarmCount: z.number().int(),
  lastUpdatedAt: z.string().nullable(),
})

const runtimePointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  quality: z.enum(['good', 'bad', 'stale']),
})

const runtimeAlarmSchema = z.object({
  id: z.string().min(1),
  level: z.enum(['warning', 'critical']),
  message: z.string().min(1),
  time: z.string().min(1),
})

const runtimeTrendSchema = z.object({
  t: z.string().min(1),
  v: z.number(),
})

const runtimeDevicePayloadSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  system: z.string().min(1),
  onlineStatus: z.enum(['online', 'offline', 'degraded']),
  updatedAt: z.string().min(1),
  points: z.array(runtimePointSchema),
  alarms: z.array(runtimeAlarmSchema),
  trend: z.array(runtimeTrendSchema),
})

const runtimeDefaults = {
  runMode: 'AI_OPT',
  runModeDescription:
    '当前处于 AI 节能优化模式：在满足末端舒适与设备约束前提下，自动寻优冷水机组与泵组组合。以下为策略说明摘要（前端默认文案）。',
  strategyHint:
    '策略版本 v1.0.0：优先保证供水温度带内运行；负荷预测每 15min 刷新；大机启停与泵变频联动由上层优化器下发建议，经人工或规则确认后执行。',
  aiSuggestion:
    '根据过去 24h 负荷曲线，建议在 14:00–18:00 区间预降供水设定 0.3°C 以平滑峰值功率；现场请以实际点表与联锁为准。',
} as const

async function parseApiError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string }
    return json.error || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

async function requestRuntime<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`)

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  return schema.parse(await response.json())
}

export async function getRuntimeOverview(): Promise<RuntimeOverview> {
  return requestRuntime('/runtime/overview', runtimeOverviewSchema)
}

export async function getDeviceRuntime(deviceId: string): Promise<DeviceRuntime> {
  const payload = await requestRuntime(
    `/runtime/devices/${encodeURIComponent(deviceId)}`,
    runtimeDevicePayloadSchema,
  )

  return {
    ...payload,
    ...runtimeDefaults,
  }
}

export type RuntimeApiClient = {
  getRuntimeOverview: typeof getRuntimeOverview
  getDeviceRuntime: typeof getDeviceRuntime
}

export const runtimeApi: RuntimeApiClient = {
  getRuntimeOverview,
  getDeviceRuntime,
}
