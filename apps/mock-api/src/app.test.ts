import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { createRequest, createResponse } from 'node-mocks-http'

import { createApp } from './app.ts'

async function setupFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'mock-api-'))
  await mkdir(path.join(root, 'scene'), { recursive: true })
  await mkdir(path.join(root, 'equipment', 'chw_pump_v1'), { recursive: true })
  const pumpDevice = {
    id: 'CHW-PUMP-1',
    type: 'pump',
    name: 'CHW Pump 1',
    assetId: 'chw_pump_v1',
    position: [0, 0.35, 0],
    rotation: [0, 0, 0],
    system: 'CHW',
    tags: [],
    boundsHalfExtents: [0.35, 0.35, 0.35],
  }
  await writeFile(
    path.join(root, 'scene', 'current.scene.json'),
    JSON.stringify({ version: 1, devices: [pumpDevice], portGroups: [{ deviceId: 'CHW-PUMP-1', ports: [] }], pipes: [] }, null, 2),
  )
  await writeFile(
    path.join(root, 'scene', 'demo.scene.json'),
    JSON.stringify({ version: 1, devices: [pumpDevice], portGroups: [{ deviceId: 'CHW-PUMP-1', ports: [] }], pipes: [] }, null, 2),
  )
  await writeFile(
    path.join(root, 'equipment', 'catalog.json'),
    JSON.stringify({ assets: ['chw_pump_v1'] }, null, 2),
  )
  await writeFile(
    path.join(root, 'equipment', 'chw_pump_v1', 'asset.json'),
    JSON.stringify(
      {
        assetVersion: 1,
        assetId: 'chw_pump_v1',
        displayName: 'CHW Pump',
        type: 'pump',
        defaultSystem: 'CHW',
        bounds: { halfExtents: [0.35, 0.35, 0.35] },
        renderStyle: 'box',
        modelGlb: false,
      },
      null,
      2,
    ),
  )
  await writeFile(
    path.join(root, 'equipment', 'chw_pump_v1', 'ports.json'),
    JSON.stringify(
      {
        ports: [
          { id: 'in', name: '入口', position: [-0.2, 0, 0], system: 'CHW', direction: 'in' },
          { id: 'out', name: '出口', position: [0.2, 0, 0], system: 'CHW', direction: 'out' },
        ],
      },
      null,
      2,
    ),
  )
  return root
}

async function performRequest(
  app: ReturnType<typeof createApp>,
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  body?: unknown,
) {
  const req = createRequest({
    method,
    url,
    body: body as Record<string, unknown> | undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  })
  const res = createResponse({ eventEmitter: EventEmitter })

  await new Promise<void>((resolve) => {
    res.on('end', resolve)
    ;(app as unknown as { handle: (req: unknown, res: unknown) => void }).handle(req, res)
  })

  return res
}

test('GET /api/health returns service metadata', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'GET', '/api/health')
  assert.equal(res.statusCode, 200)
  const body = res._getJSONData()
  assert.equal(body.ok, true)
  assert.equal(body.service, 'mock-api')
  assert.equal(typeof body.time, 'string')
})

test('GET /api/scene returns the current scene file', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'GET', '/api/scene')

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res._getJSONData(), {
    version: 1,
    devices: [
      {
        id: 'CHW-PUMP-1',
        type: 'pump',
        name: 'CHW Pump 1',
        assetId: 'chw_pump_v1',
        position: [0, 0.35, 0],
        rotation: [0, 0, 0],
        system: 'CHW',
        tags: [],
        boundsHalfExtents: [0.35, 0.35, 0.35],
      },
    ],
    portGroups: [{ deviceId: 'CHW-PUMP-1', ports: [] }],
    pipes: [],
  })
})

test('PUT /api/scene rejects invalid scene payloads', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'PUT', '/api/scene', { version: 0 })

  assert.equal(res.statusCode, 400)
  assert.equal(res._getJSONData().ok, false)
})

test('POST /api/scene/reset-demo overwrites the current scene', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  await writeFile(
    path.join(dataRoot, 'scene', 'demo.scene.json'),
    JSON.stringify(
      {
        version: 1,
        devices: [
          {
            id: 'PUMP-1',
            type: 'pump',
            name: 'Pump 1',
            assetId: 'chw_pump_v1',
            position: [0, 0.35, 0],
            rotation: [0, 0, 0],
            system: 'CHW',
            tags: [],
            boundsHalfExtents: [0.35, 0.35, 0.35],
          },
        ],
        portGroups: [{ deviceId: 'PUMP-1', ports: [] }],
        pipes: [],
      },
      null,
      2,
    ),
  )

  const res = await performRequest(app, 'POST', '/api/scene/reset-demo')
  assert.equal(res.statusCode, 200)
  assert.equal(res._getJSONData().devices[0].id, 'PUMP-1')
})

test('GET /api/equipment/catalog returns equipment ids', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'GET', '/api/equipment/catalog')

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res._getJSONData(), { assets: ['chw_pump_v1'] })
})

test('GET /api/equipment/:assetId and ports return persisted asset files', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const assetRes = await performRequest(app, 'GET', '/api/equipment/chw_pump_v1')
  const portsRes = await performRequest(app, 'GET', '/api/equipment/chw_pump_v1/ports')

  assert.equal(assetRes.statusCode, 200)
  assert.equal(assetRes._getJSONData().assetId, 'chw_pump_v1')
  assert.equal(portsRes.statusCode, 200)
  assert.equal(portsRes._getJSONData().ports.length, 2)
})

test('GET /api/runtime/overview returns runtime summary fields', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'GET', '/api/runtime/overview')

  assert.equal(res.statusCode, 200)
  const body = res._getJSONData()
  assert.equal(typeof body.totalPower, 'number')
  assert.equal(typeof body.avgCop, 'number')
  assert.equal(typeof body.activeAlarmCount, 'number')
  assert.equal(typeof body.lastUpdatedAt, 'string')
  assert.match(body.lastUpdatedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('GET /api/runtime/overview computes freshness per request', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const first = await performRequest(app, 'GET', '/api/runtime/overview')
  await new Promise((resolve) => setTimeout(resolve, 20))
  const second = await performRequest(app, 'GET', '/api/runtime/overview')

  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  assert.notEqual(first._getJSONData().lastUpdatedAt, second._getJSONData().lastUpdatedAt)
})

test('GET /api/runtime/devices/:deviceId returns runtime detail fields', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'GET', '/api/runtime/devices/CHW-PUMP-1')

  assert.equal(res.statusCode, 200)
  const body = res._getJSONData()
  assert.equal(body.deviceId, 'CHW-PUMP-1')
  assert.equal(body.deviceName, 'CHW Pump 1')
  assert.equal(body.system, 'CHW')
  assert.equal(body.onlineStatus, 'online')
  assert.equal(typeof body.updatedAt, 'string')
  assert.ok(Array.isArray(body.points))
  assert.ok(Array.isArray(body.alarms))
  assert.ok(Array.isArray(body.trend))
  assert.deepEqual(body.points[0], {
    id: 'power',
    name: 'Power',
    value: 18.4,
    unit: 'kW',
    quality: 'good',
  })
  assert.deepEqual(body.alarms[0], {
    id: 'CHW-PUMP-1-LOW-FLOW',
    level: 'warning',
    message: 'Flow is below target',
    time: body.alarms[0].time,
  })
  assert.deepEqual(body.trend[0], { t: body.trend[0].t, v: 17.9 })
})

test('GET /api/runtime/devices/:deviceId reflects the current scene inventory', async () => {
  const dataRoot = await setupFixture()
  await writeFile(
    path.join(dataRoot, 'scene', 'current.scene.json'),
    JSON.stringify(
      {
        version: 1,
        devices: [
          {
            id: 'CHW-PUMP-2',
            type: 'pump',
            name: 'CHW Pump 2',
            assetId: 'chw_pump_v1',
            position: [1, 0.35, 0],
            rotation: [0, 0, 0],
            system: 'CHW',
            tags: [],
            boundsHalfExtents: [0.35, 0.35, 0.35],
          },
        ],
        portGroups: [{ deviceId: 'CHW-PUMP-2', ports: [] }],
        pipes: [],
      },
      null,
      2,
    ),
  )

  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'GET', '/api/runtime/devices/CHW-PUMP-2')

  assert.equal(res.statusCode, 200)
  const body = res._getJSONData()
  assert.equal(body.deviceId, 'CHW-PUMP-2')
  assert.equal(body.deviceName, 'CHW Pump 2')
  assert.equal(body.system, 'CHW')
})

test('GET /api/runtime/devices/UNKNOWN returns not found', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })
  const res = await performRequest(app, 'GET', '/api/runtime/devices/UNKNOWN')

  assert.equal(res.statusCode, 404)
  assert.equal(res._getJSONData().ok, false)
})
