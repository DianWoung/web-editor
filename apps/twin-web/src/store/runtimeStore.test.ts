import test from 'node:test'
import assert from 'node:assert/strict'

import type { DeviceRuntime } from '../schemas/deviceRuntime.ts'
import { runtimeApi } from '../services/api/runtimeApi.ts'
import { useRuntimeStore } from './runtimeStore.ts'

function makeRuntime(overrides: Partial<DeviceRuntime>): DeviceRuntime {
  return {
    deviceId: 'CH-01',
    deviceName: '1#离心机组',
    system: 'CHW',
    onlineStatus: 'online',
    updatedAt: '2026-04-02T00:00:00.000Z',
    points: [{ id: 'power', name: 'Power', value: 420, unit: 'kW', quality: 'good' }],
    trend: [{ t: '2026-04-02T00:00:00.000Z', v: 420 }],
    alarms: [],
    runMode: 'AI_OPT',
    runModeDescription: 'mock',
    strategyHint: 'hint',
    aiSuggestion: 'suggestion',
    ...overrides,
  }
}

test('runtime store fetchOverview stores overview payload and summary fields', async () => {
  const originalGetRuntimeOverview = runtimeApi.getRuntimeOverview
  runtimeApi.getRuntimeOverview = async () => ({
    totalPower: 512.4,
    avgCop: 5.23,
    activeAlarmCount: 2,
    lastUpdatedAt: '2026-04-02T00:00:00.000Z',
  })

  try {
    useRuntimeStore.getState().clear()
    await useRuntimeStore.getState().fetchOverview()

    const next = useRuntimeStore.getState()
    assert.deepEqual(next.overview, {
      totalPower: 512.4,
      avgCop: 5.23,
      activeAlarmCount: 2,
      lastUpdatedAt: '2026-04-02T00:00:00.000Z',
    })
    assert.equal(next.totalPower, 512.4)
    assert.equal(next.avgCop, 5.23)
    assert.equal(next.activeAlarmCount, 2)
    assert.equal(next.loadingOverview, false)
    assert.equal(next.overviewError, null)
    assert.equal(typeof next.lastFetchedAt, 'string')
  } finally {
    runtimeApi.getRuntimeOverview = originalGetRuntimeOverview
  }
})

test('runtime store fetchDeviceRuntime caches device payload and clears loading', async () => {
  const originalGetDeviceRuntime = runtimeApi.getDeviceRuntime
  runtimeApi.getDeviceRuntime = async () =>
    makeRuntime({
      deviceId: 'PUMP-01',
      deviceName: '1#冷冻泵',
      system: 'CHW',
      onlineStatus: 'degraded',
    })

  try {
    useRuntimeStore.getState().clear()
    await useRuntimeStore.getState().fetchDeviceRuntime('PUMP-01')

    const next = useRuntimeStore.getState()
    assert.equal(next.loadingDeviceIds.includes('PUMP-01'), false)
    assert.equal(next.deviceErrorById['PUMP-01'], undefined)
    assert.equal(next.getDeviceRuntime('PUMP-01')?.deviceName, '1#冷冻泵')
    assert.equal(next.getDeviceRuntime('PUMP-01')?.onlineStatus, 'degraded')
  } finally {
    runtimeApi.getDeviceRuntime = originalGetDeviceRuntime
  }
})

test('runtime store records overview errors from the runtime api', async () => {
  const originalGetRuntimeOverview = runtimeApi.getRuntimeOverview
  runtimeApi.getRuntimeOverview = async () => {
    throw new Error('overview failed')
  }

  try {
    useRuntimeStore.getState().clear()
    await useRuntimeStore.getState().fetchOverview()

    const next = useRuntimeStore.getState()
    assert.equal(next.overviewError, 'overview failed')
    assert.equal(next.loadingOverview, false)
  } finally {
    runtimeApi.getRuntimeOverview = originalGetRuntimeOverview
  }
})

test('runtime store clears back to its initial api-backed state', () => {
  useRuntimeStore.getState().clear()

  const next = useRuntimeStore.getState()
  assert.equal(next.overview, null)
  assert.equal(next.runtimes.size, 0)
  assert.equal(next.totalPower, 0)
  assert.equal(next.avgCop, 0)
  assert.equal(next.activeAlarmCount, 0)
  assert.equal(next.loadingOverview, false)
  assert.deepEqual(next.loadingDeviceIds, [])
})
