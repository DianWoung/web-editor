import assert from 'node:assert/strict'
import test from 'node:test'

import type { DeviceRuntime, RuntimeOverview } from '../schemas/deviceRuntime.ts'
import { createRuntimeStore } from './runtimeStore.ts'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeOverview(overrides: Partial<RuntimeOverview> = {}): RuntimeOverview {
  return {
    totalPower: 512.4,
    avgCop: 5.23,
    activeAlarmCount: 2,
    lastUpdatedAt: '2026-04-02T00:00:00.000Z',
    ...overrides,
  }
}

function makeRuntime(overrides: Partial<DeviceRuntime> = {}): DeviceRuntime {
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
  const pending = deferred<RuntimeOverview>()
  const store = createRuntimeStore({
    getRuntimeOverview: () => pending.promise,
    getDeviceRuntime: async () => makeRuntime(),
  })

  const fetchPromise = store.getState().fetchOverview()
  assert.equal(store.getState().loadingOverview, true)
  assert.equal(store.getState().overviewError, null)

  pending.resolve(makeOverview())
  await fetchPromise

  const next = store.getState()
  assert.deepEqual(next.overview, makeOverview())
  assert.equal(next.totalPower, 512.4)
  assert.equal(next.avgCop, 5.23)
  assert.equal(next.activeAlarmCount, 2)
  assert.equal(next.loadingOverview, false)
  assert.equal(next.overviewError, null)
  assert.equal(typeof next.lastFetchedAt, 'string')
})

test('runtime store fetchDeviceRuntime caches device payload by id and reuses cached values', async () => {
  let calls = 0
  const store = createRuntimeStore({
    getRuntimeOverview: async () => makeOverview(),
    getDeviceRuntime: async (deviceId) => {
      calls += 1
      return makeRuntime({
        deviceId,
        deviceName: '1#冷冻泵',
        system: 'CHW',
        onlineStatus: 'degraded',
      })
    },
  })

  const first = await store.getState().fetchDeviceRuntime('PUMP-01')
  const second = await store.getState().fetchDeviceRuntime('PUMP-01')

  const next = store.getState()
  assert.equal(calls, 1)
  assert.deepEqual(first, second)
  assert.equal(next.loadingDeviceIds.has('PUMP-01'), false)
  assert.equal(next.deviceErrorById.get('PUMP-01') ?? null, null)
  assert.equal(next.deviceRuntimeById.get('PUMP-01')?.deviceName, '1#冷冻泵')
  assert.equal(next.getDeviceRuntime('PUMP-01')?.onlineStatus, 'degraded')
})

test('runtime store records overview errors from the runtime api', async () => {
  const store = createRuntimeStore({
    getRuntimeOverview: async () => {
      throw new Error('overview failed')
    },
    getDeviceRuntime: async () => makeRuntime(),
  })

  await assert.rejects(() => store.getState().fetchOverview(), /overview failed/)

  const next = store.getState()
  assert.equal(next.overviewError, 'overview failed')
  assert.equal(next.loadingOverview, false)
})

test('runtime store clears device fetch errors after a successful retry', async () => {
  let shouldFail = true
  const store = createRuntimeStore({
    getRuntimeOverview: async () => makeOverview(),
    getDeviceRuntime: async (deviceId) => {
      if (shouldFail) {
        throw new Error(`runtime unavailable for ${deviceId}`)
      }
      return makeRuntime({ deviceId })
    },
  })

  await assert.rejects(() => store.getState().fetchDeviceRuntime('CH-01', { force: true }), /runtime unavailable/)
  assert.equal(store.getState().loadingDeviceIds.has('CH-01'), false)
  assert.match(store.getState().deviceErrorById.get('CH-01') ?? '', /runtime unavailable/)

  shouldFail = false
  await store.getState().fetchDeviceRuntime('CH-01', { force: true })

  const next = store.getState()
  assert.equal(next.deviceErrorById.get('CH-01') ?? null, null)
  assert.equal(next.deviceRuntimeById.get('CH-01')?.deviceId, 'CH-01')
})
