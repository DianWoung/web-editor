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
