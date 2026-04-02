import { create } from 'zustand'

import type { Device } from '../schemas/device.ts'
import type { DeviceRuntime, RuntimeOverview } from '../schemas/deviceRuntime.ts'
import { runtimeApi } from '../services/api/runtimeApi.ts'

type RuntimeState = {
  overview: RuntimeOverview | null
  runtimes: Map<string, DeviceRuntime>
  totalPower: number
  avgCop: number
  activeAlarmCount: number
  lastUpdatedAt: string | null
  loadingOverview: boolean
  loadingDeviceIds: string[]
  overviewError: string | null
  deviceErrorById: Record<string, string>
  lastFetchedAt: string | null
}

type RuntimeActions = {
  fetchOverview: () => Promise<void>
  fetchDeviceRuntime: (deviceId: string) => Promise<void>
  refreshRuntimes: (devices: Device[]) => void
  getDeviceRuntime: (deviceId: string) => DeviceRuntime | undefined
  clear: () => void
}

const initialState: RuntimeState = {
  overview: null,
  runtimes: new Map(),
  totalPower: 0,
  avgCop: 0,
  activeAlarmCount: 0,
  lastUpdatedAt: null,
  loadingOverview: false,
  loadingDeviceIds: [],
  overviewError: null,
  deviceErrorById: {},
  lastFetchedAt: null,
}

export const useRuntimeStore = create<RuntimeState & RuntimeActions>((set, get) => ({
  ...initialState,

  fetchOverview: async () => {
    set({ loadingOverview: true, overviewError: null })
    try {
      const overview = await runtimeApi.getRuntimeOverview()
      set({
        overview,
        totalPower: overview.totalPower,
        avgCop: overview.avgCop,
        activeAlarmCount: overview.activeAlarmCount,
        lastUpdatedAt: overview.lastUpdatedAt,
        loadingOverview: false,
        overviewError: null,
        lastFetchedAt: new Date().toISOString(),
      })
    } catch (error) {
      set({
        loadingOverview: false,
        overviewError: error instanceof Error ? error.message : String(error),
      })
    }
  },

  fetchDeviceRuntime: async (deviceId) => {
    set((state) => ({
      loadingDeviceIds: state.loadingDeviceIds.includes(deviceId)
        ? state.loadingDeviceIds
        : [...state.loadingDeviceIds, deviceId],
      deviceErrorById: { ...state.deviceErrorById, [deviceId]: '' },
    }))

    try {
      const runtime = await runtimeApi.getDeviceRuntime(deviceId)
      set((state) => {
        const runtimes = new Map(state.runtimes)
        runtimes.set(deviceId, runtime)
        const loadingDeviceIds = state.loadingDeviceIds.filter((id) => id !== deviceId)
        const deviceErrorById = { ...state.deviceErrorById }
        delete deviceErrorById[deviceId]
        return {
          runtimes,
          loadingDeviceIds,
          deviceErrorById,
          lastFetchedAt: new Date().toISOString(),
        }
      })
    } catch (error) {
      set((state) => ({
        loadingDeviceIds: state.loadingDeviceIds.filter((id) => id !== deviceId),
        deviceErrorById: {
          ...state.deviceErrorById,
          [deviceId]: error instanceof Error ? error.message : String(error),
        },
      }))
    }
  },

  refreshRuntimes: (devices: Device[]) => {
    void get().fetchOverview()
    devices.forEach((device) => {
      void get().fetchDeviceRuntime(device.id)
    })
  },

  getDeviceRuntime: (deviceId) => get().runtimes.get(deviceId),

  clear: () => set(initialState),
}))
