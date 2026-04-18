import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { createAssetStore } from './assetStore.ts'

async function setupLegacyEquipmentFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'asset-store-'))
  await mkdir(path.join(root, 'equipment', 'legacy_pump_v1'), { recursive: true })
  await writeFile(
    path.join(root, 'equipment', 'catalog.json'),
    JSON.stringify({ assets: ['legacy_pump_v1'] }, null, 2),
  )
  await writeFile(
    path.join(root, 'equipment', 'legacy_pump_v1', 'asset.json'),
    JSON.stringify(
      {
        assetVersion: 1,
        assetId: 'legacy_pump_v1',
        displayName: 'Legacy Pump',
        type: 'pump',
        defaultSystem: 'CHW',
        bounds: { halfExtents: [1, 1, 1] },
        renderStyle: 'box',
        modelGlb: true,
      },
      null,
      2,
    ),
  )
  await writeFile(
    path.join(root, 'equipment', 'legacy_pump_v1', 'ports.json'),
    JSON.stringify(
      {
        ports: [{ id: 'in', name: '入口', position: [0, 0, 0], system: 'CHW', direction: 'in' }],
      },
      null,
      2,
    ),
  )
  return root
}

test('createAssetStore only exposes a legacy modelUrl when model.glb exists on disk', async () => {
  const dataRoot = await setupLegacyEquipmentFixture()
  await mkdir(path.join(dataRoot, 'equipment', 'legacy_model_v1'), { recursive: true })
  await writeFile(
    path.join(dataRoot, 'equipment', 'catalog.json'),
    JSON.stringify({ assets: ['legacy_pump_v1', 'legacy_model_v1'] }, null, 2),
  )
  await writeFile(
    path.join(dataRoot, 'equipment', 'legacy_model_v1', 'asset.json'),
    JSON.stringify(
      {
        assetVersion: 1,
        assetId: 'legacy_model_v1',
        displayName: 'Legacy Model',
        type: 'pump',
        defaultSystem: 'CHW',
        bounds: { halfExtents: [1, 1, 1] },
        renderStyle: 'box',
        modelGlb: true,
      },
      null,
      2,
    ),
  )
  await writeFile(
    path.join(dataRoot, 'equipment', 'legacy_model_v1', 'ports.json'),
    JSON.stringify({ ports: [] }, null, 2),
  )
  await writeFile(path.join(dataRoot, 'equipment', 'legacy_model_v1', 'model.glb'), 'glb-bytes')

  const store = createAssetStore(dataRoot)
  const list = store.listAssets('all').items
  const noFileModel = list.find((item) => item.assetKey === 'legacy_pump_v1')
  const withFileModel = list.find((item) => item.assetKey === 'legacy_model_v1')

  assert.equal(noFileModel?.modelUrl, null)
  assert.equal(withFileModel?.modelUrl, '/api/assets/models/legacy_model_v1')
  assert.equal(store.getPublishedAssetJson('legacy_pump_v1').modelGlb, false)
  assert.equal(store.getPublishedAssetJson('legacy_model_v1').modelGlb, true)
})

test('createAssetStore imports missing legacy equipment even when the database already has assets', async () => {
  const dataRoot = await setupLegacyEquipmentFixture()
  const dbPath = path.join(dataRoot, 'asset-center.sqlite')
  const db = new DatabaseSync(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS equipment_assets (
      id TEXT PRIMARY KEY,
      asset_key TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      type TEXT NOT NULL,
      default_system TEXT NOT NULL,
      asset_version INTEGER NOT NULL,
      render_style TEXT NOT NULL,
      bounds_x REAL NOT NULL,
      bounds_y REAL NOT NULL,
      bounds_z REAL NOT NULL,
      model_url TEXT,
      model_upload_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  db.prepare(`
    INSERT INTO equipment_assets (
      id, asset_key, display_name, type, default_system, asset_version, render_style,
      bounds_x, bounds_y, bounds_z, model_url, model_upload_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'draft-1',
    'custom_draft_v1',
    'Custom Draft',
    'custom',
    'CHW',
    1,
    'box',
    1,
    1,
    1,
    null,
    null,
    'draft',
    '2026-04-09T00:00:00.000Z',
    '2026-04-09T00:00:00.000Z',
  )
  db.close()

  const store = createAssetStore(dataRoot)
  const assets = store.listAssets('all').items.map((item) => item.assetKey)

  assert.deepEqual(assets.sort(), ['custom_draft_v1', 'legacy_pump_v1'])
})

test('createAssetStore persists connector semantics and still projects published ports compatibly', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'asset-store-'))
  const store = createAssetStore(dataRoot)

  const created = store.createAssetDraft({
    assetKey: 'semantic_heat_pump_v1',
    displayName: 'Semantic Heat Pump',
    type: 'heat-pump',
    defaultSystem: 'HW',
    assetVersion: 1,
    renderStyle: 'box',
    bounds: { halfExtents: [1, 1, 1] },
    modelUploadId: null,
  })

  const replaced = store.replaceAssetPorts(created.asset.id, [
    {
      portKey: 'supply_out',
      name: '供水出水',
      position: [0.6, 0.1, 0],
      system: 'HW',
      direction: 'out',
      role: 'supply',
      medium: 'water',
      side: 'right',
      groupKey: 'water_loop',
      required: true,
      normal: [1, 0, 0],
    },
  ])

  assert.equal(replaced.connectors.length, 1)
  assert.deepEqual(replaced.connectors[0], {
    id: 'supply_out',
    connectorKey: 'supply_out',
    portKey: 'supply_out',
    name: '供水出水',
    system: 'HW',
    role: 'supply',
    medium: 'water',
    direction: 'out',
    side: 'right',
    groupKey: 'water_loop',
    required: true,
    sortOrder: 0,
    geometry: {
      anchor: [0.6, 0.1, 0],
      normal: [1, 0, 0],
    },
  })

  const detail = store.getAsset(created.asset.id)
  assert.equal(detail.connectors.length, 1)
  assert.equal(detail.ports.length, 1)
  assert.equal(detail.connectors[0].role, 'supply')
  assert.equal(detail.connectors[0].medium, 'water')
  assert.equal(detail.connectors[0].side, 'right')
  assert.equal(detail.connectors[0].groupKey, 'water_loop')
  assert.equal(detail.connectors[0].required, true)
  assert.deepEqual(detail.ports[0], {
    id: 'supply_out',
    portKey: 'supply_out',
    name: '供水出水',
    position: [0.6, 0.1, 0],
    system: 'HW',
    direction: 'out',
    sortOrder: 0,
  })

  store.publishAsset(created.asset.id)
  assert.deepEqual(store.getPublishedPortsJson('semantic_heat_pump_v1'), {
    ports: [
      {
        id: 'supply_out',
        name: '供水出水',
        position: [0.6, 0.1, 0],
        system: 'HW',
        direction: 'out',
      },
    ],
  })
})

test('createAssetStore lists topology templates and applies a template snapshot to an asset', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'asset-store-'))
  const store = createAssetStore(dataRoot)

  const created = store.createAssetDraft({
    assetKey: 'template_chiller_v1',
    displayName: 'Template Chiller',
    type: 'chiller',
    defaultSystem: 'CHW',
    assetVersion: 1,
    renderStyle: 'box',
    bounds: { halfExtents: [1, 1, 1] },
    modelUploadId: null,
  })

  const templates = store.listTopologyTemplates()
  assert.ok(templates.items.length > 0)

  const selectedTemplate = templates.items.find((item) => item.templateKey === 'chw_supply_return')
  assert.ok(selectedTemplate)

  const applied = store.applyTopologyTemplate(created.asset.id, selectedTemplate.id)
  assert.equal(applied.template.id, selectedTemplate.id)
  assert.equal(applied.connectors.length, 2)
  assert.deepEqual(
    applied.connectors.map((connector) => ({
      connectorKey: connector.connectorKey,
      system: connector.system,
      role: connector.role,
      direction: connector.direction,
      required: connector.required,
    })),
    [
      {
        connectorKey: 'chw_in',
        system: 'CHW',
        role: 'return',
        direction: 'in',
        required: true,
      },
      {
        connectorKey: 'chw_out',
        system: 'CHW',
        role: 'supply',
        direction: 'out',
        required: true,
      },
    ],
  )

  const detail = store.getAsset(created.asset.id)
  assert.equal(detail.asset.topologyTemplateId, selectedTemplate.id)
  assert.equal(detail.asset.topologyTemplateKey, selectedTemplate.templateKey)
  assert.equal(detail.asset.topologyTemplateName, selectedTemplate.displayName)
  assert.equal(detail.connectors.length, 2)

  store.publishAsset(created.asset.id)
  assert.deepEqual(store.getPublishedPortsJson('template_chiller_v1'), {
    ports: [
      {
        id: 'chw_in',
        name: '冷冻回水入口',
        position: [-1.2, 0, 0],
        system: 'CHW',
        direction: 'in',
      },
      {
        id: 'chw_out',
        name: '冷冻供水出口',
        position: [1.2, 0, 0],
        system: 'CHW',
        direction: 'out',
      },
    ],
  })
})

test('createAssetStore can create and update topology templates', async () => {
  const dataRoot = await mkdtemp(path.join(tmpdir(), 'asset-store-'))
  const store = createAssetStore(dataRoot)

  const created = store.createTopologyTemplate({
    templateKey: 'dual_power_signal',
    displayName: '双电源信号接口',
    category: 'power_signal',
    description: '包含主电源、备用电源和控制信号的模板。',
    defaultSystem: 'ELE',
    connectors: [
      {
        connectorKey: 'power_main',
        name: '主电源输入',
        system: 'ELE',
        role: 'power_in',
        medium: 'electric',
        direction: 'in',
        required: true,
        position: [-0.8, 0, 0],
        normal: [-1, 0, 0],
      },
      {
        connectorKey: 'signal_io',
        name: '控制信号',
        system: 'SIG',
        role: 'signal',
        medium: 'signal',
        direction: 'in',
        required: false,
        position: [0.8, 0, 0],
        normal: [1, 0, 0],
      },
    ],
  })

  assert.equal(created.templateKey, 'dual_power_signal')
  assert.equal(created.connectors.length, 2)

  const updated = store.updateTopologyTemplate(created.id, {
    templateKey: 'dual_power_signal',
    displayName: '双电源与信号接口',
    category: 'power_signal',
    description: '更新后的模板说明。',
    defaultSystem: 'ELE',
    connectors: [
      {
        connectorKey: 'power_main',
        name: '主电源输入',
        system: 'ELE',
        role: 'power_in',
        medium: 'electric',
        direction: 'in',
        required: true,
        position: [-1, 0, 0],
        normal: [-1, 0, 0],
      },
    ],
  })

  assert.equal(updated.displayName, '双电源与信号接口')
  assert.equal(updated.connectors.length, 1)
  assert.equal(updated.connectors[0]?.geometry.anchor[0], -1)
})
