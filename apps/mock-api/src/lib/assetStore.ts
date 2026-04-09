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

function toAssetListItem(row: PersistedAssetRow): AssetListItem {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  `)

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

  function listPorts(assetId: string) {
    const rows = db
      .prepare('SELECT * FROM equipment_ports WHERE asset_id = ? ORDER BY sort_order ASC, id ASC')
      .all(assetId) as PersistedPortRow[]
    return rows.map((row) => ({
      id: row.port_key,
      portKey: row.port_key,
      name: row.name,
      position: [row.position_x, row.position_y, row.position_z] as [number, number, number],
      system: row.system,
      direction: row.direction,
      sortOrder: row.sort_order,
    }))
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
    const asset = toAssetListItem(getAssetRow(assetId))
    return {
      asset,
      ports: listPorts(assetId),
      bindings: listBindings(assetId),
    }
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
        bounds_x, bounds_y, bounds_z, model_url, model_upload_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertPort = db.prepare(`
      INSERT INTO equipment_ports (
        asset_id, port_key, name, position_x, position_y, position_z, system, direction, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            index,
          )
        }
      }
    })
  }

  syncLegacyEquipmentIfNeeded()

  const insertAssetStmt = db.prepare(`
    INSERT INTO equipment_assets (
      id, asset_key, display_name, type, default_system, asset_version, render_style,
      bounds_x, bounds_y, bounds_z, model_url, model_upload_id, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      asset_id, port_key, name, position_x, position_y, position_z, system, direction, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  return {
    listAssets(status?: 'draft' | 'published' | 'archived' | 'all') {
      const rows = (
        status && status !== 'all'
          ? db.prepare('SELECT * FROM equipment_assets WHERE status = ? ORDER BY updated_at DESC').all(status)
          : db.prepare('SELECT * FROM equipment_assets ORDER BY updated_at DESC').all()
      ) as PersistedAssetRow[]
      return { items: rows.map(toAssetListItem) }
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
            index,
          )
        }
      })
      return { ports: listPorts(assetId) }
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
        ports: listPorts(asset.id).map((port) => ({
          id: port.portKey,
          name: port.name,
          position: port.position,
          system: port.system,
          direction: port.direction,
        })),
      }
    },
  }
}

export type AssetStore = ReturnType<typeof createAssetStore>
