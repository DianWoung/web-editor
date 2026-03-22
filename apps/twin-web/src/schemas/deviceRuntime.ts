/** 阶段 2：设备运行态 Mock（对接真 API 前） */

export type TelemetryQuality = 'good' | 'bad'

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

export type DeviceRuntimeMock = {
  deviceId: string
  deviceName: string
  system: string
  points: TelemetryPoint[]
  trend: TrendSample[]
  alarms: AlarmRow[]
  runMode: string
  runModeDescription: string
  strategyHint: string
  aiSuggestion: string
}
