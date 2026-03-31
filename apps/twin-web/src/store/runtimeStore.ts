import { create } from 'zustand'

import type { Device } from '../schemas/device.ts'
import type { AlarmRow, DeviceRuntimeMock } from '../schemas/deviceRuntime.ts'
import { getMockDeviceRuntime } from '../services/mockDeviceRuntime.ts'

type RuntimeState = {
  runtimes: Map<string, DeviceRuntimeMock>
  globalAlarms: AlarmRow[]
  totalPower: number
  avgCop: number
  activeAlarmCount: number
  lastUpdatedAt: string | null
}

type RuntimeActions = {
  refreshRuntimes: (devices: Device[]) => void
  getDeviceRuntime: (deviceId: string) => DeviceRuntimeMock | undefined
  clear: () => void
}

const initialState: RuntimeState = {
  runtimes: new Map(),
  globalAlarms: [],
  totalPower: 0,
  avgCop: 0,
  activeAlarmCount: 0,
  lastUpdatedAt: null,
}

export const useRuntimeStore = create<RuntimeState & RuntimeActions>((set, get) => ({
  ...initialState,

  refreshRuntimes: (devices) => {
    const runtimes = new Map<string, DeviceRuntimeMock>()
    const globalAlarms: AlarmRow[] = []
    let totalPower = 0
    let copTotal = 0
    let copCount = 0

    devices.forEach((device) => {
      const runtime = getMockDeviceRuntime(device)
      runtimes.set(device.id, runtime)
      globalAlarms.push(...runtime.alarms)

      const powerPoint = runtime.points.find((point) => point.id === 'power')
      if (powerPoint) totalPower += powerPoint.value

      const copPoint = runtime.points.find((point) => point.id === 'cop')
      if (copPoint) {
        copTotal += copPoint.value
        copCount += 1
      }
    })

    set({
      runtimes,
      globalAlarms,
      totalPower: Math.round(totalPower * 10) / 10,
      avgCop: copCount > 0 ? Math.round((copTotal / copCount) * 100) / 100 : 0,
      activeAlarmCount: globalAlarms.length,
      lastUpdatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    })
  },

  getDeviceRuntime: (deviceId) => get().runtimes.get(deviceId),

  clear: () => set(initialState),
}))
