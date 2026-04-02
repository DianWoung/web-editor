import test from 'node:test'
import assert from 'node:assert/strict'

import { getDeviceRuntime, getRuntimeOverview } from './runtimeApi.ts'

test('getRuntimeOverview parses overview payload from the backend', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        totalPower: 512.4,
        avgCop: 5.23,
        activeAlarmCount: 2,
        lastUpdatedAt: '2026-04-02T00:00:00.000Z',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch

  try {
    const overview = await getRuntimeOverview()
    assert.deepEqual(overview, {
      totalPower: 512.4,
      avgCop: 5.23,
      activeAlarmCount: 2,
      lastUpdatedAt: '2026-04-02T00:00:00.000Z',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('getDeviceRuntime parses backend payload and adds default detail copy', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        deviceId: 'CHW-PUMP-1',
        deviceName: 'CHW Pump 1',
        system: 'CHW',
        onlineStatus: 'degraded',
        updatedAt: '2026-04-02T00:00:00.000Z',
        points: [{ id: 'power', name: 'Power', value: 18.4, unit: 'kW', quality: 'stale' }],
        alarms: [{ id: 'A-1', level: 'critical', message: 'Snapshot alarm', time: '2026-04-02T00:00:00.000Z' }],
        trend: [{ t: '2026-04-02T00:00:00.000Z', v: 18.4 }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch

  try {
    const detail = await getDeviceRuntime('CHW-PUMP-1')
    assert.equal(detail.deviceId, 'CHW-PUMP-1')
    assert.equal(detail.onlineStatus, 'degraded')
    assert.equal(detail.points[0]?.quality, 'stale')
    assert.equal(detail.runMode, 'AI_OPT')
    assert.ok(detail.strategyHint.length > 0)
    assert.ok(detail.aiSuggestion.length > 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})
