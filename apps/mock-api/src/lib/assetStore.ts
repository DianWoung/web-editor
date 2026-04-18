import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { HttpError } from './httpErrors.ts'
import {
  assetJsonSchema,
  catalogSchema,
  portsFileSchema,
  type AssetDetail,
  type AssetListItem,
  type AssetUpload,
  type AssetVersion,
  type TopologyTemplateDetail,
  type TopologyTemplateListItem,
} from '../schemas.ts'

type AssetMutationInput = {
  assetKey: string
  displayName: string
  type: string
  defaultSystem: string
  assetVersion: number
  renderStyle: 'box' | 'icosahedron' | 'dodecahedron' | 'octahedron'
  bounds: {
    halfExtents: [number, number, number]
  }
  modelUploadId?: string | null
}

type AssetPortInput = {
  portKey: string
  name: string
  position: [number, number, number]
  system: string
  direction: string
  role?: string
  medium?: string | null
  side?: string | null
  groupKey?: string | null
  required?: boolean
  normal?: [number, number, number] | null
}

type AssetBindingInput = {
  bindingType: 'device_identity' | 'point_mapping' | 'runtime_field'
  bindingKey: string
  bindingValue: string
  note: string
}

type PersistedAssetRow = {
  id: string
  asset_key: string
  display_name: string
  type: string
  default_system: string
  asset_version: number
  render_style: 'box' | 'icosahedron' | 'dodecahedron' | 'octahedron'
  bounds_x: number
  bounds_y: number
  bounds_z: number
  model_url: string | null
  topology_template_id: string | null
  topology_snapshot_version: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
}

type PersistedPortRow = {
  id: number
  port_key: string
  name: string
  position_x: number
  position_y: number
  position_z: number
  system: string
  direction: string
  role: string | null
  medium: string | null
  side: string | null
  group_key: string | null
  required: number | null
  normal_x: number | null
  normal_y: number | null
  normal_z: number | null
  sort_order: number
}

type PersistedBindingRow = {
  id: number
  binding_type: 'device_identity' | 'point_mapping' | 'runtime_field'
  binding_key: string
  binding_value: string
  note: string | null
}

type PersistedVersionRow = {
  id: string
  version_no: number
  snapshot_json: string
  published_at: string
  published_by: string
}

type PersistedUploadRow = {
  id: string
  file_name: string
  storage_key: string
  public_url: string
  mime_type: string
  size_bytes: number
  upload_status: 'uploaded'
  created_at: string
}

type PersistedTopologyTemplateRow = {
  id: string
  template_key: string
  display_name: string
  category: string
  description: string
  default_system: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

type PersistedTopologyTemplateConnectorRow = {
  id: string
  template_id: string
  connector_key: string
  name: string
  system: string
  role: string
  medium: string | null
  direction: string
  required: number
  position_x: number
  position_y: number
  position_z: number
  normal_x: number | null
  normal_y: number | null
  normal_z: number | null
  sort_order: number
}

const defaultTopologyTemplates = [
  {
    id: 'tpl_chw_supply_return',
    templateKey: 'chw_supply_return',
    displayName: '双口 CHW 供回水',
    category: 'water_loop',
    description: '适用于标准冷冻水双口设备，包含一个回水入口和一个供水出口。',
    defaultSystem: 'CHW',
    connectors: [
      {
        id: 'tpl_chw_supply_return_chw_in',
        connectorKey: 'chw_in',
        name: '冷冻回水入口',
        system: 'CHW',
        role: 'return',
        medium: 'water',
        direction: 'in',
        required: true,
        sortOrder: 0,
        geometry: {
          anchor: [-1.2, 0, 0] as [number, number, number],
          normal: [-1, 0, 0] as [number, number, number],
        },
      },
      {
        id: 'tpl_chw_supply_return_chw_out',
        connectorKey: 'chw_out',
        name: '冷冻供水出口',
        system: 'CHW',
        role: 'supply',
        medium: 'water',
        direction: 'out',
        required: true,
        sortOrder: 1,
        geometry: {
          anchor: [1.2, 0, 0] as [number, number, number],
          normal: [1, 0, 0] as [number, number, number],
        },
      },
    ],
  },
  {
    id: 'tpl_chw_power_signal',
    templateKey: 'chw_power_signal',
    displayName: 'CHW + 电源 + 信号',
    category: 'hybrid',
    description: '适用于带冷冻水接口并附加电源和控制信号接口的复合设备。',
    defaultSystem: 'CHW',
    connectors: [
      {
        id: 'tpl_chw_power_signal_chw_in',
        connectorKey: 'chw_in',
        name: '冷冻回水入口',
        system: 'CHW',
        role: 'return',
        medium: 'water',
        direction: 'in',
        required: true,
        sortOrder: 0,
        geometry: {
          anchor: [-1.2, 0, 0] as [number, number, number],
          normal: [-1, 0, 0] as [number, number, number],
        },
      },
      {
        id: 'tpl_chw_power_signal_chw_out',
        connectorKey: 'chw_out',
        name: '冷冻供水出口',
        system: 'CHW',
        role: 'supply',
        medium: 'water',
        direction: 'out',
        required: true,
        sortOrder: 1,
        geometry: {
          anchor: [1.2, 0, 0] as [number, number, number],
          normal: [1, 0, 0] as [number, number, number],
        },
      },
      {
        id: 'tpl_chw_power_signal_power_in',
        connectorKey: 'power_in',
        name: '主电源输入',
        system: 'ELE',
        role: 'power_in',
        medium: 'electric',
        direction: 'in',
        required: true,
        sortOrder: 2,
        geometry: {
          anchor: [0, 0.8, 0] as [number, number, number],
          normal: [0, 1, 0] as [number, number, number],
        },
      },
    ],
  },
] as const

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function parseJsonFile<T>(filePath: string, schema: { parse: (value: unknown) => T }): T {
  const raw = readFileSync(filePath, 'utf8')
  return schema.parse(JSON.parse(raw))
}

function getLegacyModelUrl(dataRoot: string, assetKey: string, declaresModelGlb: boolean | undefined) {
  if (!declaresModelGlb) {
    return null
  }
  const modelPath = path.join(dataRoot, 'equipment', assetKey, 'model.glb')
  return existsSync(modelPath) ? `/api/assets/models/${assetKey}` : null
}

function toAssetListItem(
  row: PersistedAssetRow,
  templateSummary?: Pick<TopologyTemplateListItem, 'id' | 'templateKey' | 'displayName'> | null,
): AssetListItem {
  return {
    id: row.id,
    assetKey: row.asset_key,
    displayName: row.display_name,
    type: row.type,
    defaultSystem: row.default_system,
    assetVersion: row.asset_version,
    renderStyle: row.render_style,
    bounds: {
      halfExtents: [row.bounds_x, row.bounds_y, row.bounds_z],
    },
    modelUrl: row.model_url,
    status: row.status,
    topologyTemplateId: templateSummary?.id ?? row.topology_template_id ?? null,
    topologyTemplateKey: templateSummary?.templateKey ?? null,
    topologyTemplateName: templateSummary?.displayName ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function ensureTableColumns(
  db: DatabaseSync,
  tableName: string,
  columns: Array<{ name: string; definition: string }>,
) {
  const existing = new Set(
    (
      db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
        name: string
      }>
    ).map((column) => column.name),
  )

  for (const column of columns) {
    if (existing.has(column.name)) {
      continue
    }
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition}`)
  }
}

function toConnector(row: PersistedPortRow) {
  const normal =
    row.normal_x === null || row.normal_y === null || row.normal_z === null
      ? null
      : ([row.normal_x, row.normal_y, row.normal_z] as [number, number, number])

  return {
    id: row.port_key,
    connectorKey: row.port_key,
    portKey: row.port_key,
    name: row.name,
    system: row.system,
    role: row.role ?? 'generic',
    medium: row.medium,
    direction: row.direction,
    side: row.side,
    groupKey: row.group_key,
    required: Boolean(row.required ?? 0),
    sortOrder: row.sort_order,
    geometry: {
      anchor: [row.position_x, row.position_y, row.position_z] as [number, number, number],
      normal,
    },
  }
}

function toPortProjection(row: ReturnType<typeof toConnector>) {
  return {
    id: row.portKey,
    portKey: row.portKey,
    name: row.name,
    position: row.geometry.anchor,
    system: row.system,
    direction: row.direction,
    sortOrder: row.sortOrder,
  }
}

function toTopologyTemplateConnector(row: PersistedTopologyTemplateConnectorRow): TopologyTemplateDetail['connectors'][number] {
  const normal =
    row.normal_x === null || row.normal_y === null || row.normal_z === null
      ? null
      : ([row.normal_x, row.normal_y, row.normal_z] as [number, number, number])

  return {
    id: row.id,
    connectorKey: row.connector_key,
    name: row.name,
    system: row.system,
    role: row.role,
    medium: row.medium,
    direction: row.direction,
    required: Boolean(row.required),
    sortOrder: row.sort_order,
    geometry: {
      anchor: [row.position_x, row.position_y, row.position_z] as [number, number, number],
      normal,
    },
  }
}

export function createAssetStore(dataRoot: string) {
  mkdirSync(dataRoot, { recursive: true })
  const dbPath = path.join(dataRoot, 'asset-center.sqlite')
  const db = new DatabaseSync(dbPath)

  db.exec(`
    PRAGMA foreign_keys = ON;

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
      topology_template_id TEXT,
      topology_snapshot_version TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipment_ports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      port_key TEXT NOT NULL,
      name TEXT NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      position_z REAL NOT NULL,
      system TEXT NOT NULL,
      direction TEXT NOT NULL,
      role TEXT,
      medium TEXT,
      side TEXT,
      group_key TEXT,
      required INTEGER,
      normal_x REAL,
      normal_y REAL,
      normal_z REAL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY(asset_id) REFERENCES equipment_assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS equipment_bindings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      binding_type TEXT NOT NULL,
      binding_key TEXT NOT NULL,
      binding_value TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY(asset_id) REFERENCES equipment_assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS equipment_asset_versions (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      published_at TEXT NOT NULL,
      published_by TEXT NOT NULL,
      FOREIGN KEY(asset_id) REFERENCES equipment_assets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS equipment_uploads (
      id TEXT PRIMARY KEY,
      asset_id TEXT,
      file_name TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      public_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      upload_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(asset_id) REFERENCES equipment_assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS topology_templates (
      id TEXT PRIMARY KEY,
      template_key TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      default_system TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topology_template_connectors (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      connector_key TEXT NOT NULL,
      name TEXT NOT NULL,
      system TEXT NOT NULL,
      role TEXT NOT NULL,
      medium TEXT,
      direction TEXT NOT NULL,
      required INTEGER NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      position_z REAL NOT NULL,
      normal_x REAL,
      normal_y REAL,
      normal_z REAL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY(template_id) REFERENCES topology_templates(id) ON DELETE CASCADE
    );
  `)

  ensureTableColumns(db, 'equipment_assets', [
    { name: 'topology_template_id', definition: 'TEXT' },
    { name: 'topology_snapshot_version', definition: 'TEXT' },
  ])

  ensureTableColumns(db, 'equipment_ports', [
    { name: 'role', definition: 'TEXT' },
    { name: 'medium', definition: 'TEXT' },
    { name: 'side', definition: 'TEXT' },
    { name: 'group_key', definition: 'TEXT' },
    { name: 'required', definition: 'INTEGER' },
    { name: 'normal_x', definition: 'REAL' },
    { name: 'normal_y', definition: 'REAL' },
    { name: 'normal_z', definition: 'REAL' },
  ])

  function transaction<T>(run: () => T): T {
    db.exec('BEGIN')
    try {
      const result = run()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  function getAssetRow(assetId: string) {
    const row = db.prepare('SELECT * FROM equipment_assets WHERE id = ?').get(assetId) as PersistedAssetRow | undefined
    if (!row) {
      throw new HttpError(404, `资产不存在：${assetId}`)
    }
    return row
  }

  function getAssetRowByKey(assetKey: string, publishedOnly = false) {
    const row = db
      .prepare(`SELECT * FROM equipment_assets WHERE asset_key = ? ${publishedOnly ? "AND status = 'published'" : ''}`)
      .get(assetKey) as PersistedAssetRow | undefined
    if (!row) {
      throw new HttpError(404, `资产不存在：${assetKey}`)
    }
    return row
  }

  function getUploadRow(uploadId: string) {
    const row = db.prepare('SELECT * FROM equipment_uploads WHERE id = ?').get(uploadId) as PersistedUploadRow | undefined
    if (!row) {
      throw new HttpError(404, `上传文件不存在：${uploadId}`)
    }
    return row
  }

  function listTopologyTemplateRows() {
    return db
      .prepare("SELECT * FROM topology_templates WHERE status = 'active' ORDER BY updated_at DESC, display_name ASC")
      .all() as PersistedTopologyTemplateRow[]
  }

  function getTopologyTemplateRow(templateId: string) {
    const row = db
      .prepare("SELECT * FROM topology_templates WHERE id = ? AND status = 'active'")
      .get(templateId) as PersistedTopologyTemplateRow | undefined
    if (!row) {
      throw new HttpError(404, `连接拓扑模板不存在：${templateId}`)
    }
    return row
  }

  function listTopologyTemplateConnectors(templateId: string) {
    const rows = db
      .prepare('SELECT * FROM topology_template_connectors WHERE template_id = ? ORDER BY sort_order ASC, id ASC')
      .all(templateId) as PersistedTopologyTemplateConnectorRow[]
    return rows.map(toTopologyTemplateConnector)
  }

  function toTopologyTemplateListItem(row: PersistedTopologyTemplateRow): TopologyTemplateListItem {
    const connectorCount = (
      db
        .prepare('SELECT COUNT(*) AS count FROM topology_template_connectors WHERE template_id = ?')
        .get(row.id) as { count: number }
    ).count

    return {
      id: row.id,
      templateKey: row.template_key,
      displayName: row.display_name,
      category: row.category,
      description: row.description,
      defaultSystem: row.default_system,
      connectorCount,
      updatedAt: row.updated_at,
    }
  }

  function getTopologyTemplateSummary(templateId: string | null) {
    if (!templateId) {
      return null
    }
    const row = db.prepare('SELECT * FROM topology_templates WHERE id = ?').get(templateId) as PersistedTopologyTemplateRow | undefined
    return row ? toTopologyTemplateListItem(row) : null
  }

  function getTopologyTemplateDetail(templateId: string): TopologyTemplateDetail {
    const row = getTopologyTemplateRow(templateId)
    return {
      ...toTopologyTemplateListItem(row),
      connectors: listTopologyTemplateConnectors(templateId),
    }
  }

  function listConnectors(assetId: string) {
    const rows = db
      .prepare('SELECT * FROM equipment_ports WHERE asset_id = ? ORDER BY sort_order ASC, id ASC')
      .all(assetId) as PersistedPortRow[]
    return rows.map(toConnector)
  }

  function listPorts(assetId: string) {
    return listConnectors(assetId).map(toPortProjection)
  }

  function listBindings(assetId: string) {
    const rows = db
      .prepare('SELECT * FROM equipment_bindings WHERE asset_id = ? ORDER BY id ASC')
      .all(assetId) as PersistedBindingRow[]
    return rows.map((row) => ({
      id: String(row.id),
      bindingType: row.binding_type,
      bindingKey: row.binding_key,
      bindingValue: row.binding_value,
      note: row.note ?? '',
    }))
  }

  function listVersions(assetId: string): { items: AssetVersion[] } {
    getAssetRow(assetId)
    const rows = db
      .prepare('SELECT * FROM equipment_asset_versions WHERE asset_id = ? ORDER BY version_no DESC')
      .all(assetId) as PersistedVersionRow[]
    return {
      items: rows.map((row) => ({
        id: row.id,
        versionNo: row.version_no,
        publishedAt: row.published_at,
        publishedBy: row.published_by,
        snapshotJson: JSON.parse(row.snapshot_json) as Record<string, unknown>,
      })),
    }
  }

  function getAssetDetail(assetId: string): AssetDetail {
    const assetRow = getAssetRow(assetId)
    const asset = toAssetListItem(assetRow, getTopologyTemplateSummary(assetRow.topology_template_id))
    const connectors = listConnectors(assetId)
    return {
      asset,
      connectors,
      ports: connectors.map(toPortProjection),
      bindings: listBindings(assetId),
    }
  }

  function seedTopologyTemplatesIfNeeded() {
    const count = (db.prepare('SELECT COUNT(*) AS count FROM topology_templates').get() as { count: number }).count
    if (count > 0) {
      return
    }

    const insertTemplate = db.prepare(`
      INSERT INTO topology_templates (
        id, template_key, display_name, category, description, default_system, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertConnector = db.prepare(`
      INSERT INTO topology_template_connectors (
        id, template_id, connector_key, name, system, role, medium, direction, required,
        position_x, position_y, position_z, normal_x, normal_y, normal_z, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const now = new Date().toISOString()

    transaction(() => {
      for (const template of defaultTopologyTemplates) {
        insertTemplate.run(
          template.id,
          template.templateKey,
          template.displayName,
          template.category,
          template.description,
          template.defaultSystem,
          'active',
          now,
          now,
        )
        for (const connector of template.connectors) {
          insertConnector.run(
            connector.id,
            template.id,
            connector.connectorKey,
            connector.name,
            connector.system,
            connector.role,
            connector.medium,
            connector.direction,
            connector.required ? 1 : 0,
            connector.geometry.anchor[0],
            connector.geometry.anchor[1],
            connector.geometry.anchor[2],
            connector.geometry.normal?.[0] ?? null,
            connector.geometry.normal?.[1] ?? null,
            connector.geometry.normal?.[2] ?? null,
            connector.sortOrder,
          )
        }
      }
    })
  }

  function syncLegacyEquipmentIfNeeded() {
    const catalogPath = path.join(dataRoot, 'equipment', 'catalog.json')
    if (!existsSync(catalogPath)) {
      return
    }

    const catalog = parseJsonFile(catalogPath, catalogSchema)
    const insertAsset = db.prepare(`
      INSERT INTO equipment_assets (
        id, asset_key, display_name, type, default_system, asset_version, render_style,
        bounds_x, bounds_y, bounds_z, model_url, model_upload_id, topology_template_id, topology_snapshot_version, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertPort = db.prepare(`
      INSERT INTO equipment_ports (
        asset_id, port_key, name, position_x, position_y, position_z, system, direction,
        role, medium, side, group_key, required, normal_x, normal_y, normal_z, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const now = new Date().toISOString()

    transaction(() => {
      for (const assetKey of catalog.assets) {
        const assetDir = path.join(dataRoot, 'equipment', assetKey)
        const asset = parseJsonFile(path.join(assetDir, 'asset.json'), assetJsonSchema)
        const ports = parseJsonFile(path.join(assetDir, 'ports.json'), portsFileSchema)
        const legacyModelUrl = getLegacyModelUrl(dataRoot, asset.assetId, asset.modelGlb)
        const existing = db
          .prepare('SELECT id, model_url, status FROM equipment_assets WHERE asset_key = ?')
          .get(assetKey) as { id: string; model_url: string | null; status: string } | undefined
        if (existing) {
          const shouldNormalizeLegacyModelUrl =
            existing.model_url === null ||
            existing.model_url === `/api/assets/models/${asset.assetId}`

          if (shouldNormalizeLegacyModelUrl && existing.model_url !== legacyModelUrl) {
            db.prepare('UPDATE equipment_assets SET model_url = ?, updated_at = ? WHERE id = ?').run(
              legacyModelUrl,
              now,
              existing.id,
            )
          }
          continue
        }
        const assetId = createId('asset')
        insertAsset.run(
          assetId,
          asset.assetId,
          asset.displayName,
          asset.type,
          asset.defaultSystem,
          asset.assetVersion,
          asset.renderStyle ?? 'box',
          asset.bounds.halfExtents[0],
          asset.bounds.halfExtents[1],
          asset.bounds.halfExtents[2],
          legacyModelUrl,
          null,
          null,
          null,
          'published',
          now,
          now,
        )
        for (const [index, port] of ports.ports.entries()) {
          insertPort.run(
            assetId,
            port.id,
            port.name,
            port.position[0],
            port.position[1],
            port.position[2],
            port.system,
            port.direction,
            'generic',
            null,
            null,
            null,
            0,
            null,
            null,
            null,
            index,
          )
        }
      }
    })
  }

  seedTopologyTemplatesIfNeeded()
  syncLegacyEquipmentIfNeeded()

  const insertAssetStmt = db.prepare(`
    INSERT INTO equipment_assets (
      id, asset_key, display_name, type, default_system, asset_version, render_style,
      bounds_x, bounds_y, bounds_z, model_url, model_upload_id, topology_template_id, topology_snapshot_version, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const updateAssetStmt = db.prepare(`
    UPDATE equipment_assets
    SET asset_key = ?, display_name = ?, type = ?, default_system = ?, asset_version = ?, render_style = ?,
        bounds_x = ?, bounds_y = ?, bounds_z = ?, model_url = ?, model_upload_id = ?, updated_at = ?
    WHERE id = ?
  `)
  const replacePortsDeleteStmt = db.prepare('DELETE FROM equipment_ports WHERE asset_id = ?')
  const replacePortsInsertStmt = db.prepare(`
    INSERT INTO equipment_ports (
      asset_id, port_key, name, position_x, position_y, position_z, system, direction,
      role, medium, side, group_key, required, normal_x, normal_y, normal_z, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const replaceBindingsDeleteStmt = db.prepare('DELETE FROM equipment_bindings WHERE asset_id = ?')
  const replaceBindingsInsertStmt = db.prepare(`
    INSERT INTO equipment_bindings (asset_id, binding_type, binding_key, binding_value, note)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertVersionStmt = db.prepare(`
    INSERT INTO equipment_asset_versions (id, asset_id, version_no, snapshot_json, published_at, published_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const updateStatusStmt = db.prepare('UPDATE equipment_assets SET status = ?, updated_at = ? WHERE id = ?')
  const deleteAssetStmt = db.prepare('DELETE FROM equipment_assets WHERE id = ?')
  const insertUploadStmt = db.prepare(`
    INSERT INTO equipment_uploads (id, asset_id, file_name, storage_key, public_url, mime_type, size_bytes, upload_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const attachUploadStmt = db.prepare('UPDATE equipment_uploads SET asset_id = ? WHERE id = ?')
  const applyTopologyTemplateStmt = db.prepare(`
    UPDATE equipment_assets
    SET topology_template_id = ?, topology_snapshot_version = ?, updated_at = ?
    WHERE id = ?
  `)

  return {
    listTopologyTemplates() {
      return { items: listTopologyTemplateRows().map(toTopologyTemplateListItem) }
    },

    getTopologyTemplate(templateId: string) {
      return getTopologyTemplateDetail(templateId)
    },

    listAssets(status?: 'draft' | 'published' | 'archived' | 'all') {
      const rows = (
        status && status !== 'all'
          ? db.prepare('SELECT * FROM equipment_assets WHERE status = ? ORDER BY updated_at DESC').all(status)
          : db.prepare('SELECT * FROM equipment_assets ORDER BY updated_at DESC').all()
      ) as PersistedAssetRow[]
      return { items: rows.map((row) => toAssetListItem(row, getTopologyTemplateSummary(row.topology_template_id))) }
    },

    createAssetDraft(input: AssetMutationInput) {
      const existing = db.prepare('SELECT id FROM equipment_assets WHERE asset_key = ?').get(input.assetKey) as
        | { id: string }
        | undefined
      if (existing) {
        throw new HttpError(409, `资产标识已存在：${input.assetKey}`)
      }
      const assetId = createId('asset')
      const now = new Date().toISOString()
      const upload = input.modelUploadId ? getUploadRow(input.modelUploadId) : null
      insertAssetStmt.run(
        assetId,
        input.assetKey,
        input.displayName,
        input.type,
        input.defaultSystem,
        input.assetVersion,
        input.renderStyle,
        input.bounds.halfExtents[0],
        input.bounds.halfExtents[1],
        input.bounds.halfExtents[2],
        upload?.public_url ?? null,
        upload?.id ?? null,
        null,
        null,
        'draft',
        now,
        now,
      )
      if (upload) {
        attachUploadStmt.run(assetId, upload.id)
      }
      return getAssetDetail(assetId)
    },

    getAsset: getAssetDetail,

    updateAsset(assetId: string, input: AssetMutationInput) {
      getAssetRow(assetId)
      const duplicate = db
        .prepare('SELECT id FROM equipment_assets WHERE asset_key = ? AND id != ?')
        .get(input.assetKey, assetId) as { id: string } | undefined
      if (duplicate) {
        throw new HttpError(409, `资产标识已存在：${input.assetKey}`)
      }
      const upload = input.modelUploadId === undefined ? null : input.modelUploadId ? getUploadRow(input.modelUploadId) : null
      const current = getAssetRow(assetId)
      const modelUrl = input.modelUploadId === undefined ? current.model_url : upload?.public_url ?? null
      const modelUploadId = input.modelUploadId === undefined ? null : upload?.id ?? null
      const updatedAt = new Date().toISOString()
      updateAssetStmt.run(
        input.assetKey,
        input.displayName,
        input.type,
        input.defaultSystem,
        input.assetVersion,
        input.renderStyle,
        input.bounds.halfExtents[0],
        input.bounds.halfExtents[1],
        input.bounds.halfExtents[2],
        modelUrl,
        modelUploadId,
        updatedAt,
        assetId,
      )
      if (upload) {
        attachUploadStmt.run(assetId, upload.id)
      }
      return getAssetDetail(assetId)
    },

    applyTopologyTemplate(assetId: string, templateId: string) {
      getAssetRow(assetId)
      const template = getTopologyTemplateDetail(templateId)
      const snapshotVersion = `${template.updatedAt}:${template.id}`
      const updatedAt = new Date().toISOString()
      transaction(() => {
        replacePortsDeleteStmt.run(assetId)
        for (const connector of template.connectors) {
          replacePortsInsertStmt.run(
            assetId,
            connector.connectorKey,
            connector.name,
            connector.geometry.anchor[0],
            connector.geometry.anchor[1],
            connector.geometry.anchor[2],
            connector.system,
            connector.direction,
            connector.role,
            connector.medium ?? null,
            null,
            null,
            connector.required ? 1 : 0,
            connector.geometry.normal?.[0] ?? null,
            connector.geometry.normal?.[1] ?? null,
            connector.geometry.normal?.[2] ?? null,
            connector.sortOrder,
          )
        }
        applyTopologyTemplateStmt.run(template.id, snapshotVersion, updatedAt, assetId)
      })

      return {
        template,
        connectors: listConnectors(assetId),
        ports: listPorts(assetId),
      }
    },

    replaceAssetPorts(assetId: string, ports: AssetPortInput[]) {
      getAssetRow(assetId)
      transaction(() => {
        replacePortsDeleteStmt.run(assetId)
        for (const [index, port] of ports.entries()) {
          replacePortsInsertStmt.run(
            assetId,
            port.portKey,
            port.name,
            port.position[0],
            port.position[1],
            port.position[2],
            port.system,
            port.direction,
            port.role ?? 'generic',
            port.medium ?? null,
            port.side ?? null,
            port.groupKey ?? null,
            port.required ? 1 : 0,
            port.normal?.[0] ?? null,
            port.normal?.[1] ?? null,
            port.normal?.[2] ?? null,
            index,
          )
        }
      })
      const connectors = listConnectors(assetId)
      return { connectors, ports: connectors.map(toPortProjection) }
    },

    replaceAssetBindings(assetId: string, bindings: AssetBindingInput[]) {
      getAssetRow(assetId)
      transaction(() => {
        replaceBindingsDeleteStmt.run(assetId)
        for (const binding of bindings) {
          replaceBindingsInsertStmt.run(
            assetId,
            binding.bindingType,
            binding.bindingKey,
            binding.bindingValue,
            binding.note,
          )
        }
      })
      return { bindings: listBindings(assetId) }
    },

    saveUpload(upload: AssetUpload) {
      insertUploadStmt.run(
        upload.id,
        null,
        upload.fileName,
        upload.storageKey,
        upload.publicUrl,
        upload.mimeType,
        upload.sizeBytes,
        upload.uploadStatus,
        upload.createdAt,
      )
      return {
        upload,
      }
    },

    getUpload(uploadId: string) {
      const row = getUploadRow(uploadId)
      return {
        id: row.id,
        fileName: row.file_name,
        storageKey: row.storage_key,
        publicUrl: row.public_url,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        uploadStatus: row.upload_status,
        createdAt: row.created_at,
      } satisfies AssetUpload
    },

    publishAsset(assetId: string) {
      const detail = getAssetDetail(assetId)
      const existingVersions = listVersions(assetId).items
      const versionNo = existingVersions.length + 1
      const publishedAt = new Date().toISOString()
      const snapshotJson = {
        asset: detail.asset,
        connectors: detail.connectors,
        ports: detail.ports,
        bindings: detail.bindings,
      }
      transaction(() => {
        updateStatusStmt.run('published', publishedAt, assetId)
        insertVersionStmt.run(
          createId('asset_version'),
          assetId,
          versionNo,
          JSON.stringify(snapshotJson),
          publishedAt,
          'system',
        )
      })
      return getAssetDetail(assetId)
    },

    archiveAsset(assetId: string) {
      getAssetRow(assetId)
      updateStatusStmt.run('archived', new Date().toISOString(), assetId)
      return getAssetDetail(assetId)
    },

    deleteAsset(assetId: string) {
      getAssetRow(assetId)
      deleteAssetStmt.run(assetId)
      return { ok: true }
    },

    listAssetVersions: listVersions,

    listPublishedAssetKeys() {
      const rows = db
        .prepare("SELECT asset_key FROM equipment_assets WHERE status = 'published' ORDER BY asset_key ASC")
        .all() as Array<{ asset_key: string }>
      return rows.map((row) => row.asset_key)
    },

    getPublishedAssetJson(assetKey: string) {
      const asset = getAssetRowByKey(assetKey, true)
      return {
        assetVersion: asset.asset_version,
        assetId: asset.asset_key,
        displayName: asset.display_name,
        type: asset.type,
        defaultSystem: asset.default_system,
        bounds: {
          halfExtents: [asset.bounds_x, asset.bounds_y, asset.bounds_z] as [number, number, number],
        },
        renderStyle: asset.render_style,
        modelGlb: Boolean(asset.model_url),
        modelUrl: asset.model_url,
      }
    },

    getPublishedPortsJson(assetKey: string) {
      const asset = getAssetRowByKey(assetKey, true)
      return {
        ports: listConnectors(asset.id).map((connector) => ({
          id: connector.portKey,
          name: connector.name,
          position: connector.geometry.anchor,
          system: connector.system,
          direction: connector.direction,
        })),
      }
    },
  }
}

export type AssetStore = ReturnType<typeof createAssetStore>
