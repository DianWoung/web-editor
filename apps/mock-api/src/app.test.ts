import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { createRequest, createResponse } from 'node-mocks-http'
import request from 'supertest'

import { createApp } from './app.ts'

async function setupFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'mock-api-'))
  await mkdir(path.join(root, 'scene'), { recursive: true })
  await mkdir(path.join(root, 'equipment', 'chw_pump_v1'), { recursive: true })
  await mkdir(path.join(root, 'runtime'), { recursive: true })
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

async function writeScene(
  root: string,
  devices: Array<{
    id: string
    type: string
    name: string
    assetId: string
    position: [number, number, number]
    rotation: [number, number, number]
    system: string
    tags: string[]
    boundsHalfExtents: [number, number, number]
  }>,
) {
  await writeFile(
    path.join(root, 'scene', 'current.scene.json'),
    JSON.stringify(
      {
        version: 1,
        devices,
        portGroups: devices.map((device) => ({ deviceId: device.id, ports: [] })),
        pipes: [],
      },
      null,
      2,
    ),
  )
}

async function performRequest(
  app: ReturnType<typeof createApp>,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
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

test('GET /api/scene/library returns saved named scenes', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const createRes = await performRequest(app, 'POST', '/api/scene/library', {
    name: '冷站白天工况',
    scene: {
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
  })
  assert.equal(createRes.statusCode, 200)
  const created = createRes._getJSONData()
  assert.equal(created.ok, true)
  assert.equal(created.name, '冷站白天工况')
  assert.match(created.sceneId, /^scene(-|[a-z0-9])+/)
  assert.match(created.updatedAt, /^\d{4}-\d{2}-\d{2}T/)

  const listRes = await performRequest(app, 'GET', '/api/scene/library')
  assert.equal(listRes.statusCode, 200)
  assert.equal(listRes._getJSONData().items.length, 1)
  assert.deepEqual(listRes._getJSONData().items[0], {
    id: created.sceneId,
    name: '冷站白天工况',
    updatedAt: created.updatedAt,
    deviceCount: 1,
    pipeCount: 0,
    isCurrent: false,
  })
})

test('POST /api/scene/library/:sceneId/load loads a named scene into current scene', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const createRes = await performRequest(app, 'POST', '/api/scene/library', {
    name: '冷站夜间工况',
    scene: {
      version: 1,
      devices: [
        {
          id: 'CHW-PUMP-9',
          type: 'pump',
          name: 'CHW Pump 9',
          assetId: 'chw_pump_v1',
          position: [9, 0.35, 0],
          rotation: [0, 0, 0],
          system: 'CHW',
          tags: [],
          boundsHalfExtents: [0.35, 0.35, 0.35],
        },
      ],
      portGroups: [{ deviceId: 'CHW-PUMP-9', ports: [] }],
      pipes: [],
    },
  })
  assert.equal(createRes.statusCode, 200)
  const sceneId = createRes._getJSONData().sceneId

  const loadRes = await performRequest(app, 'POST', `/api/scene/library/${sceneId}/load`)
  assert.equal(loadRes.statusCode, 200)
  assert.equal(loadRes._getJSONData().devices[0].id, 'CHW-PUMP-9')

  const currentRes = await performRequest(app, 'GET', '/api/scene')
  assert.equal(currentRes.statusCode, 200)
  assert.equal(currentRes._getJSONData().devices[0].id, 'CHW-PUMP-9')

  const listRes = await performRequest(app, 'GET', '/api/scene/library')
  assert.equal(listRes.statusCode, 200)
  assert.equal(listRes._getJSONData().items[0]?.isCurrent, true)
})

test('PUT /api/scene/library/:sceneId updates a named scene and current scene snapshot', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const createRes = await performRequest(app, 'POST', '/api/scene/library', {
    name: '冷站周末工况',
    scene: {
      version: 1,
      devices: [],
      portGroups: [],
      pipes: [],
    },
  })
  const sceneId = createRes._getJSONData().sceneId as string

  const updateRes = await performRequest(app, 'PUT', `/api/scene/library/${sceneId}`, {
    version: 1,
    devices: [
      {
        id: 'CHW-PUMP-77',
        type: 'pump',
        name: 'CHW Pump 77',
        assetId: 'chw_pump_v1',
        position: [7, 0.35, 0],
        rotation: [0, 0, 0],
        system: 'CHW',
        tags: [],
        boundsHalfExtents: [0.35, 0.35, 0.35],
      },
    ],
    portGroups: [{ deviceId: 'CHW-PUMP-77', ports: [] }],
    pipes: [],
  })

  assert.equal(updateRes.statusCode, 200)
  assert.equal(updateRes._getJSONData().sceneId, sceneId)

  const namedRes = await performRequest(app, 'GET', `/api/scene/library/${sceneId}`)
  assert.equal(namedRes.statusCode, 200)
  assert.equal(namedRes._getJSONData().devices[0]?.id, 'CHW-PUMP-77')

  const currentRes = await performRequest(app, 'GET', '/api/scene')
  assert.equal(currentRes.statusCode, 200)
  assert.equal(currentRes._getJSONData().devices[0]?.id, 'CHW-PUMP-77')

  const listRes = await performRequest(app, 'GET', '/api/scene/library')
  assert.equal(listRes.statusCode, 200)
  assert.equal(listRes._getJSONData().items[0]?.deviceCount, 1)
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

test('GET /api/assets/models/:assetId serves a legacy model file when present', async () => {
  const dataRoot = await setupFixture()
  await mkdir(path.join(dataRoot, 'equipment', 'chw_pump_v1'), { recursive: true })
  await writeFile(path.join(dataRoot, 'equipment', 'chw_pump_v1', 'model.glb'), 'legacy-glb')
  await writeFile(
    path.join(dataRoot, 'equipment', 'chw_pump_v1', 'asset.json'),
    JSON.stringify(
      {
        assetVersion: 1,
        assetId: 'chw_pump_v1',
        displayName: 'CHW Pump',
        type: 'pump',
        defaultSystem: 'CHW',
        bounds: { halfExtents: [0.35, 0.35, 0.35] },
        renderStyle: 'box',
        modelGlb: true,
      },
      null,
      2,
    ),
  )

  const app = createApp({ dataRoot })
  const modelRes = await request(app).get('/api/assets/models/chw_pump_v1')

  assert.equal(modelRes.status, 200)
  assert.equal(modelRes.text, 'legacy-glb')
})

test('asset management api supports draft create, update, list, and delete', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const createRes = await performRequest(app, 'POST', '/api/assets', {
    assetKey: 'cooling_tower_v1',
    displayName: 'Cooling Tower',
    type: 'tower',
    defaultSystem: 'CW',
    assetVersion: 1,
    renderStyle: 'box',
    bounds: { halfExtents: [1.5, 2, 1.5] },
    modelUploadId: null,
  })
  assert.equal(createRes.statusCode, 201)
  const created = createRes._getJSONData()
  assert.equal(created.asset.assetKey, 'cooling_tower_v1')
  assert.equal(created.asset.status, 'draft')

  const updateRes = await performRequest(app, 'PUT', `/api/assets/${created.asset.id}`, {
    assetKey: 'cooling_tower_v1',
    displayName: 'Cooling Tower Updated',
    type: 'tower',
    defaultSystem: 'CW',
    assetVersion: 2,
    renderStyle: 'dodecahedron',
    bounds: { halfExtents: [1.6, 2.2, 1.6] },
    modelUploadId: null,
  })
  assert.equal(updateRes.statusCode, 200)
  assert.equal(updateRes._getJSONData().asset.displayName, 'Cooling Tower Updated')
  assert.equal(updateRes._getJSONData().asset.assetVersion, 2)

  const listRes = await performRequest(app, 'GET', '/api/assets')
  assert.equal(listRes.statusCode, 200)
  assert.equal(listRes._getJSONData().items.some((item: { assetKey: string }) => item.assetKey === 'cooling_tower_v1'), true)

  const deleteRes = await performRequest(app, 'DELETE', `/api/assets/${created.asset.id}`)
  assert.equal(deleteRes.statusCode, 200)
  assert.equal(deleteRes._getJSONData().ok, true)

  const afterDeleteRes = await performRequest(app, 'GET', '/api/assets')
  assert.equal(afterDeleteRes.statusCode, 200)
  assert.equal(afterDeleteRes._getJSONData().items.some((item: { assetKey: string }) => item.assetKey === 'cooling_tower_v1'), false)
})

test('asset management api stores ports and bindings, uploads model files, and publishes to equipment catalog', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const createRes = await performRequest(app, 'POST', '/api/assets', {
    assetKey: 'heat_pump_v1',
    displayName: 'Heat Pump',
    type: 'heat-pump',
    defaultSystem: 'HW',
    assetVersion: 1,
    renderStyle: 'box',
    bounds: { halfExtents: [1.2, 1.8, 1.1] },
    modelUploadId: null,
  })
  const assetId = createRes._getJSONData().asset.id as string

  const uploadRes = await request(app)
    .post('/api/assets/uploads')
    .attach('file', Buffer.from('glb-bytes'), 'model.glb')
  assert.equal(uploadRes.status, 201)
  assert.equal(uploadRes.body.upload.fileName, 'model.glb')
  assert.match(uploadRes.body.upload.publicUrl, /^\/api\/assets\/uploads\/.+\/model\.glb$/)

  const updateRes = await performRequest(app, 'PUT', `/api/assets/${assetId}`, {
    assetKey: 'heat_pump_v1',
    displayName: 'Heat Pump',
    type: 'heat-pump',
    defaultSystem: 'HW',
    assetVersion: 1,
    renderStyle: 'octahedron',
    bounds: { halfExtents: [1.2, 1.8, 1.1] },
    modelUploadId: uploadRes.body.upload.id,
  })
  assert.equal(updateRes.statusCode, 200)
  assert.equal(updateRes._getJSONData().asset.modelUrl, uploadRes.body.upload.publicUrl)

  const portsRes = await performRequest(app, 'PUT', `/api/assets/${assetId}/ports`, {
    ports: [
      { portKey: 'in', name: '入口', position: [-0.2, 0, 0], system: 'HW', direction: 'in' },
      { portKey: 'out', name: '出口', position: [0.2, 0, 0], system: 'HW', direction: 'out' },
    ],
  })
  assert.equal(portsRes.statusCode, 200)
  assert.equal(portsRes._getJSONData().ports.length, 2)

  const bindingsRes = await performRequest(app, 'PUT', `/api/assets/${assetId}/bindings`, {
    bindings: [
      { bindingType: 'device_identity', bindingKey: 'bacnet_device_id', bindingValue: '1001', note: 'demo' },
      { bindingType: 'point_mapping', bindingKey: 'supply_temp', bindingValue: 'AI1', note: '' },
    ],
  })
  assert.equal(bindingsRes.statusCode, 200)
  assert.equal(bindingsRes._getJSONData().bindings.length, 2)

  const detailRes = await performRequest(app, 'GET', `/api/assets/${assetId}`)
  assert.equal(detailRes.statusCode, 200)
  assert.equal(detailRes._getJSONData().asset.assetKey, 'heat_pump_v1')
  assert.equal(detailRes._getJSONData().ports.length, 2)
  assert.equal(detailRes._getJSONData().bindings.length, 2)

  const publishRes = await performRequest(app, 'POST', `/api/assets/${assetId}/publish`)
  assert.equal(publishRes.statusCode, 200)
  assert.equal(publishRes._getJSONData().asset.status, 'published')

  const versionsRes = await performRequest(app, 'GET', `/api/assets/${assetId}/versions`)
  assert.equal(versionsRes.statusCode, 200)
  assert.equal(versionsRes._getJSONData().items.length, 1)

  const catalogRes = await performRequest(app, 'GET', '/api/equipment/catalog')
  assert.equal(catalogRes.statusCode, 200)
  assert.equal(catalogRes._getJSONData().assets.includes('heat_pump_v1'), true)

  const equipmentAssetRes = await performRequest(app, 'GET', '/api/equipment/heat_pump_v1')
  assert.equal(equipmentAssetRes.statusCode, 200)
  assert.equal(equipmentAssetRes._getJSONData().assetId, 'heat_pump_v1')
  assert.equal(equipmentAssetRes._getJSONData().modelGlb, true)

  const equipmentPortsRes = await performRequest(app, 'GET', '/api/equipment/heat_pump_v1/ports')
  assert.equal(equipmentPortsRes.statusCode, 200)
  assert.equal(equipmentPortsRes._getJSONData().ports.length, 2)

  const fileRes = await request(app).get(uploadRes.body.upload.publicUrl)
  assert.equal(fileRes.status, 200)
  assert.equal(fileRes.text, 'glb-bytes')

  const archiveRes = await performRequest(app, 'POST', `/api/assets/${assetId}/archive`)
  assert.equal(archiveRes.statusCode, 200)
  assert.equal(archiveRes._getJSONData().asset.status, 'archived')

  const archivedCatalogRes = await performRequest(app, 'GET', '/api/equipment/catalog')
  assert.equal(archivedCatalogRes.statusCode, 200)
  assert.equal(archivedCatalogRes._getJSONData().assets.includes('heat_pump_v1'), false)
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

test('GET /api/runtime/overview is stable for the same scene', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const first = await performRequest(app, 'GET', '/api/runtime/overview')
  const second = await performRequest(app, 'GET', '/api/runtime/overview')

  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  assert.deepEqual(first._getJSONData(), second._getJSONData())
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
  assert.equal(typeof body.updatedAt, 'string')
  assert.ok(Array.isArray(body.points))
  assert.ok(Array.isArray(body.alarms))
  assert.ok(Array.isArray(body.trend))
  assert.ok(['online', 'offline', 'degraded'].includes(body.onlineStatus))
  assert.equal(body.points.length > 0, true)
  assert.equal(body.trend.length > 0, true)
  assert.equal(typeof body.points[0].value, 'number')
  assert.equal(typeof body.trend[0].v, 'number')
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

test('GET /api/runtime/overview is derived from generated scene device runtimes', async () => {
  const dataRoot = await setupFixture()
  await writeScene(dataRoot, [
    {
      id: 'CH-01',
      type: 'chiller',
      name: '1#离心机组',
      assetId: 'chiller_centrifugal_v1',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      system: 'CHW',
      tags: [],
      boundsHalfExtents: [1, 1, 1],
    },
    {
      id: 'PUMP-01',
      type: 'pump',
      name: '1#冷冻泵',
      assetId: 'chw_pump_v1',
      position: [1, 0.35, 0],
      rotation: [0, 0, 0],
      system: 'CHW',
      tags: [],
      boundsHalfExtents: [0.35, 0.35, 0.35],
    },
  ])
  const app = createApp({ dataRoot })

  const overviewRes = await performRequest(app, 'GET', '/api/runtime/overview')
  const chillerRes = await performRequest(app, 'GET', '/api/runtime/devices/CH-01')
  const pumpRes = await performRequest(app, 'GET', '/api/runtime/devices/PUMP-01')

  assert.equal(overviewRes.statusCode, 200)
  assert.equal(chillerRes.statusCode, 200)
  assert.equal(pumpRes.statusCode, 200)

  const overview = overviewRes._getJSONData()
  const chiller = chillerRes._getJSONData()
  const pump = pumpRes._getJSONData()
  const expectedTotalPower =
    chiller.points.find((point: { id: string; value: number }) => point.id === 'power').value +
    pump.points.find((point: { id: string; value: number }) => point.id === 'power').value
  const copPoints = [chiller, pump]
    .flatMap((runtime) => runtime.points.filter((point: { id: string }) => point.id === 'cop'))
    .map((point: { value: number }) => point.value)
  const expectedCop = Math.round((copPoints.reduce((sum: number, value: number) => sum + value, 0) / copPoints.length) * 100) / 100
  const expectedAlarmCount = chiller.alarms.length + pump.alarms.length

  assert.equal(overview.totalPower, expectedTotalPower)
  assert.equal(overview.avgCop, expectedCop)
  assert.equal(overview.activeAlarmCount, expectedAlarmCount)
})

test('GET /api/runtime uses snapshot override when runtime snapshot exists', async () => {
  const dataRoot = await setupFixture()
  await mkdir(path.join(dataRoot, 'runtime'), { recursive: true })
  await writeFile(
    path.join(dataRoot, 'runtime', 'snapshot.json'),
    JSON.stringify(
      {
        overview: {
          totalPower: 999,
          avgCop: 6.66,
          activeAlarmCount: 2,
          lastUpdatedAt: '2026-04-02T00:00:00.000Z',
        },
        devices: {
          'CHW-PUMP-1': {
            deviceId: 'CHW-PUMP-1',
            deviceName: 'Snapshot Pump',
            system: 'CHW',
            onlineStatus: 'degraded',
            updatedAt: '2026-04-02T00:00:00.000Z',
            points: [{ id: 'power', name: 'Power', value: 99.9, unit: 'kW', quality: 'stale' }],
            alarms: [{ id: 'SNAP-1', level: 'critical', message: 'Snapshot alarm', time: '2026-04-02T00:00:00.000Z' }],
            trend: [{ t: '2026-04-02T00:00:00.000Z', v: 99.9 }],
          },
        },
      },
      null,
      2,
    ),
  )
  const app = createApp({ dataRoot })

  const overviewRes = await performRequest(app, 'GET', '/api/runtime/overview')
  const detailRes = await performRequest(app, 'GET', '/api/runtime/devices/CHW-PUMP-1')

  assert.equal(overviewRes.statusCode, 200)
  assert.equal(detailRes.statusCode, 200)
  assert.equal(overviewRes._getJSONData().totalPower, 999)
  assert.equal(overviewRes._getJSONData().avgCop, 6.66)
  assert.equal(detailRes._getJSONData().deviceName, 'Snapshot Pump')
  assert.equal(detailRes._getJSONData().onlineStatus, 'degraded')
  assert.equal(detailRes._getJSONData().points[0].quality, 'stale')
})

test('GET /api/runtime falls back to generated data when no snapshot exists', async () => {
  const dataRoot = await setupFixture()
  const app = createApp({ dataRoot })

  const overviewRes = await performRequest(app, 'GET', '/api/runtime/overview')
  const detailRes = await performRequest(app, 'GET', '/api/runtime/devices/CHW-PUMP-1')

  assert.equal(overviewRes.statusCode, 200)
  assert.equal(detailRes.statusCode, 200)
  assert.notEqual(overviewRes._getJSONData().totalPower, 999)
  assert.notEqual(detailRes._getJSONData().deviceName, 'Snapshot Pump')
})
