export type TelemetryQuality = 'good' | 'bad' | 'stale'
export type OnlineStatus = 'online' | 'offline' | 'degraded'

export type TelemetryPoint = {
  id: string
  name: string
  value: number
  unit: string
  quality: TelemetryQuality
}

export type AlarmLevel = 'warning' | 'critical'

export type AlarmRow = {
  id: string
  level: AlarmLevel
  message: string
  time: string
}

export type TrendSample = {
  t: string
  v: number
}

export type RuntimeOverview = {
  totalPower: number
  avgCop: number
  activeAlarmCount: number
  lastUpdatedAt: string | null
}

export type DeviceRuntime = {
  deviceId: string
  deviceName: string
  system: string
  onlineStatus: OnlineStatus
  updatedAt: string
  points: TelemetryPoint[]
  trend: TrendSample[]
  alarms: AlarmRow[]
  runMode: string
  runModeDescription: string
  strategyHint: string
  aiSuggestion: string
}

export type DeviceRuntimeMock = DeviceRuntime
