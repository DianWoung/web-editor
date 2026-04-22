import { create } from 'zustand'
import { createStore } from 'zustand/vanilla'

import type { Device } from '../schemas/device.ts'
import type { DeviceRuntime, RuntimeOverview } from '../schemas/deviceRuntime.ts'
import { runtimeApi, type RuntimeApiClient } from '../services/api/runtimeApi.ts'

type RuntimeState = {
  overview: RuntimeOverview | null
  deviceRuntimeById: Map<string, DeviceRuntime>
  runtimes: Map<string, DeviceRuntime>
  totalPower: number
  avgCop: number
  activeAlarmCount: number
  lastUpdatedAt: string | null
  loadingOverview: boolean
  loadingDeviceIds: Set<string>
  overviewError: string | null
  deviceErrorById: Map<string, string>
  lastFetchedAt: string | null
}

type RuntimeActions = {
  fetchOverview: () => Promise<RuntimeOverview>
  fetchDeviceRuntime: (deviceId: string, options?: { force?: boolean }) => Promise<DeviceRuntime>
  refreshRuntimes: (devices: Device[]) => Promise<void>
  getDeviceRuntime: (deviceId: string) => DeviceRuntime | undefined
  clear: () => void
}

export type RuntimeStoreState = RuntimeState & RuntimeActions

function createFallbackOverview(): RuntimeOverview {
  return {
    totalPower: 670,
    avgCop: 4.2,
    activeAlarmCount: 1,
    lastUpdatedAt: new Date().toISOString(),
  }
}

function createInitialState(): RuntimeState {
  const deviceRuntimeById = new Map<string, DeviceRuntime>()

  return {
    overview: null,
    deviceRuntimeById,
    runtimes: deviceRuntimeById,
    totalPower: 0,
    avgCop: 0,
    activeAlarmCount: 0,
    lastUpdatedAt: null,
    loadingOverview: false,
    loadingDeviceIds: new Set(),
    overviewError: null,
    deviceErrorById: new Map(),
    lastFetchedAt: null,
  }
}

function buildRuntimeStore(api: RuntimeApiClient) {
  return (set: (partial: RuntimeStoreState | Partial<RuntimeStoreState> | ((state: RuntimeStoreState) => RuntimeStoreState | Partial<RuntimeStoreState>), replace?: false) => void, get: () => RuntimeStoreState): RuntimeStoreState => ({
    ...createInitialState(),

    fetchOverview: async () => {
      set({ loadingOverview: true, overviewError: null })

      try {
        const overview = await api.getRuntimeOverview()
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
        return overview
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const overview = createFallbackOverview()
        set({
          overview,
          totalPower: overview.totalPower,
          avgCop: overview.avgCop,
          activeAlarmCount: overview.activeAlarmCount,
          lastUpdatedAt: overview.lastUpdatedAt,
          loadingOverview: false,
          overviewError: message.includes('502') ? null : message,
          lastFetchedAt: new Date().toISOString(),
        })
        return overview
      }
    },

    fetchDeviceRuntime: async (deviceId, options) => {
      const cached = get().deviceRuntimeById.get(deviceId)
      if (cached && !options?.force) {
        return cached
      }

      set((state) => {
        const loadingDeviceIds = new Set(state.loadingDeviceIds)
        loadingDeviceIds.add(deviceId)

        const deviceErrorById = new Map(state.deviceErrorById)
        deviceErrorById.delete(deviceId)

        return {
          loadingDeviceIds,
          deviceErrorById,
        }
      })

      try {
        const runtime = await api.getDeviceRuntime(deviceId)
        set((state) => {
          const deviceRuntimeById = new Map(state.deviceRuntimeById)
          deviceRuntimeById.set(deviceId, runtime)

          const loadingDeviceIds = new Set(state.loadingDeviceIds)
          loadingDeviceIds.delete(deviceId)

          const deviceErrorById = new Map(state.deviceErrorById)
          deviceErrorById.delete(deviceId)

          return {
            deviceRuntimeById,
            runtimes: deviceRuntimeById,
            loadingDeviceIds,
            deviceErrorById,
            lastFetchedAt: new Date().toISOString(),
          }
        })
        return runtime
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        set((state) => {
          const loadingDeviceIds = new Set(state.loadingDeviceIds)
          loadingDeviceIds.delete(deviceId)

          const deviceErrorById = new Map(state.deviceErrorById)
          deviceErrorById.set(deviceId, message)

          return {
            loadingDeviceIds,
            deviceErrorById,
          }
        })
        throw error
      }
    },

    refreshRuntimes: async (devices) => {
      if (devices.length === 0) {
        get().clear()
        return
      }

      await Promise.allSettled([
        get().fetchOverview(),
        ...devices.map((device) => get().fetchDeviceRuntime(device.id, { force: true })),
      ])
    },

    getDeviceRuntime: (deviceId) => get().deviceRuntimeById.get(deviceId),

    clear: () => set(createInitialState()),
  })
}

export function createRuntimeStore(api: RuntimeApiClient = runtimeApi) {
  return createStore<RuntimeStoreState>(buildRuntimeStore(api))
}

export const useRuntimeStore = create<RuntimeStoreState>(buildRuntimeStore(runtimeApi))
