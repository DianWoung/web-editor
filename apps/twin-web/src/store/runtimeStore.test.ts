import test from 'node:test'
import assert from 'node:assert/strict'

import type { Device } from '@/schemas/device'
import { useRuntimeStore } from './runtimeStore.ts'

function makeDevice(overrides: Partial<Device>): Device {
  return {
    id: 'CH-01',
    type: 'chiller',
    name: '1#离心机组',
    assetId: 'chiller_centrifugal_v1',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    system: 'CHW',
    tags: [],
    boundsHalfExtents: [1, 1, 1],
    ...overrides,
  }
}

test('runtime store refreshes runtimes and aggregates summary metrics', () => {
  const devices: Device[] = [
    makeDevice({ id: 'CH-01', type: 'chiller', name: '1#离心机组' }),
    makeDevice({ id: 'PUMP-01', type: 'pump', name: '1#冷冻泵', assetId: 'chw_pump_v1' }),
  ]

  const store = useRuntimeStore.getState()
  store.refreshRuntimes(devices)

  const next = useRuntimeStore.getState()
  const chillerRuntime = next.getDeviceRuntime('CH-01')
  const pumpRuntime = next.getDeviceRuntime('PUMP-01')

  assert.ok(chillerRuntime)
  assert.ok(pumpRuntime)
  assert.equal(next.runtimes.size, 2)
  assert.ok(next.totalPower > 0)
  assert.ok(next.avgCop > 0)
  assert.equal(next.activeAlarmCount, next.globalAlarms.length)
  assert.match(next.lastUpdatedAt ?? '', /^\d{2}:\d{2}:\d{2}$/)
})

test('runtime store clears runtime summary when given an empty device list', () => {
  useRuntimeStore.getState().refreshRuntimes([])

  const next = useRuntimeStore.getState()
  assert.equal(next.runtimes.size, 0)
  assert.equal(next.totalPower, 0)
  assert.equal(next.avgCop, 0)
  assert.equal(next.activeAlarmCount, 0)
  assert.deepEqual(next.globalAlarms, [])
})
