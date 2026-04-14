import { useCallback, useEffect, useMemo, useState } from 'react'

import { AssetBindingsEditor } from '@/components/assets/AssetBindingsEditor'
import { AssetForm } from '@/components/assets/AssetForm'
import { AssetList } from '@/components/assets/AssetList'
import { AssetUploadPanel } from '@/components/assets/AssetUploadPanel'
import { ConnectorDetailForm } from '@/components/assets/ConnectorDetailForm'
import { ConnectorList } from '@/components/assets/ConnectorList'
import type { AssetBinding, AssetConnector, AssetMutationInput, AssetUpload } from '@/schemas/assets'
import {
  createAssetDraft,
  deleteAsset,
  getAssetDetail,
  listAssets,
  listAssetVersions,
  publishAsset,
  replaceAssetBindings,
  replaceAssetPorts,
  updateAsset,
  uploadAssetModel,
  archiveAsset,
} from '@/services/api/assetsApi'

function createEmptyDraft(): AssetMutationInput {
  return {
    assetKey: '',
    displayName: '',
    type: 'equipment',
    defaultSystem: 'CHW',
    assetVersion: 1,
    renderStyle: 'box',
    bounds: { halfExtents: [1, 1, 1] },
    modelUploadId: null,
  }
}

function createEmptyConnector(): AssetConnector {
  const connectorKey = `connector_${Math.random().toString(36).slice(2, 6)}`
  return {
    id: connectorKey,
    connectorKey,
    portKey: connectorKey,
    name: '新连接点',
    system: 'CHW',
    role: 'generic',
    medium: 'water',
    direction: 'in',
    side: null,
    groupKey: null,
    required: false,
    sortOrder: 0,
    geometry: {
      anchor: [0, 0, 0],
      normal: [0, 0, 1],
    },
  }
}

function connectorsToJson(connectors: AssetConnector[]) {
  return JSON.stringify(
    connectors.map((connector) => ({
      portKey: connector.portKey,
      name: connector.name,
      position: connector.geometry.anchor,
      system: connector.system,
      direction: connector.direction,
      role: connector.role,
      medium: connector.medium,
      side: connector.side,
      groupKey: connector.groupKey,
      required: connector.required,
      normal: connector.geometry.normal ?? null,
    })),
    null,
    2,
  )
}

export function AssetsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [items, setItems] = useState<Awaited<ReturnType<typeof listAssets>>['items']>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [assetDraft, setAssetDraft] = useState<AssetMutationInput>(createEmptyDraft())
  const [connectorsDraft, setConnectorsDraft] = useState<AssetConnector[]>([])
  const [selectedConnectorKey, setSelectedConnectorKey] = useState<string | null>(null)
  const [portsMode, setPortsMode] = useState<'table' | 'json'>('table')
  const [portsJson, setPortsJson] = useState('[]')
  const [bindingsDraft, setBindingsDraft] = useState<Array<Omit<AssetBinding, 'id'>>>([])
  const [modelUpload, setModelUpload] = useState<AssetUpload | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [versionsCount, setVersionsCount] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedAssetId) ?? null,
    [items, selectedAssetId],
  )

  const refreshList = useCallback(async (preferredAssetId?: string | null) => {
    setLoadingList(true)
    try {
      const result = await listAssets(statusFilter)
      setItems(result.items)
      setSelectedAssetId((current) => {
        if (preferredAssetId) return preferredAssetId
        if (current && result.items.some((item) => item.id === current)) return current
        return result.items[0]?.id ?? null
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingList(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  useEffect(() => {
    if (!selectedAssetId) {
      setAssetDraft(createEmptyDraft())
      setConnectorsDraft([])
      setSelectedConnectorKey(null)
      setPortsJson('[]')
      setBindingsDraft([])
      setModelUpload(null)
      setVersionsCount(0)
      return
    }
    setLoadingDetail(true)
    void getAssetDetail(selectedAssetId)
      .then(async (detail) => {
        setAssetDraft({
          assetKey: detail.asset.assetKey,
          displayName: detail.asset.displayName,
          type: detail.asset.type,
          defaultSystem: detail.asset.defaultSystem,
          assetVersion: detail.asset.assetVersion,
          renderStyle: detail.asset.renderStyle,
          bounds: detail.asset.bounds,
          modelUploadId: null,
        })
        const nextConnectors =
          detail.connectors.length > 0
            ? detail.connectors
            : detail.ports.map((port, index) => ({
                id: port.id,
                connectorKey: port.portKey,
                portKey: port.portKey,
                name: port.name,
                system: port.system,
                role: 'generic',
                medium: null,
                direction: port.direction,
                side: null,
                groupKey: null,
                required: false,
                sortOrder: index,
                geometry: {
                  anchor: port.position,
                  normal: null,
                },
              }))
        setConnectorsDraft(nextConnectors)
        setSelectedConnectorKey(nextConnectors[0]?.connectorKey ?? null)
        setPortsJson(connectorsToJson(nextConnectors))
        setBindingsDraft(
          detail.bindings.map((binding) => ({
            bindingType: binding.bindingType,
            bindingKey: binding.bindingKey,
            bindingValue: binding.bindingValue,
            note: binding.note,
          })),
        )
        if (detail.asset.modelUrl) {
          setModelUpload({
            id: 'attached',
            fileName: detail.asset.modelUrl.split('/').pop() || 'model.glb',
            storageKey: detail.asset.modelUrl,
            publicUrl: detail.asset.modelUrl,
            mimeType: 'model/gltf-binary',
            sizeBytes: 0,
            uploadStatus: 'uploaded',
            createdAt: detail.asset.updatedAt,
          })
        } else {
          setModelUpload(null)
        }
        const versions = await listAssetVersions(selectedAssetId)
        setVersionsCount(versions.items.length)
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setLoadingDetail(false))
  }, [selectedAssetId])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const created = await createAssetDraft(assetDraft)
      setMessage(`已创建资产草稿：${created.asset.displayName}`)
      await refreshList(created.asset.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBasic = async () => {
    if (!selectedAssetId) return
    setSaving(true)
    try {
      const detail = await updateAsset(selectedAssetId, {
        ...assetDraft,
        modelUploadId: modelUpload?.id === 'attached' ? undefined : modelUpload?.id ?? null,
      })
      setAssetDraft({
        assetKey: detail.asset.assetKey,
        displayName: detail.asset.displayName,
        type: detail.asset.type,
        defaultSystem: detail.asset.defaultSystem,
        assetVersion: detail.asset.assetVersion,
        renderStyle: detail.asset.renderStyle,
        bounds: detail.asset.bounds,
        modelUploadId: modelUpload?.id ?? null,
      })
      setMessage(`已保存基础信息：${detail.asset.displayName}`)
      await refreshList(selectedAssetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSavePorts = async () => {
    if (!selectedAssetId) return
    setSaving(true)
    try {
      const nextPorts =
        portsMode === 'table'
          ? connectorsDraft.map((connector) => ({
              portKey: connector.portKey,
              name: connector.name,
              position: connector.geometry.anchor,
              system: connector.system,
              direction: connector.direction,
              role: connector.role,
              medium: connector.medium,
              side: connector.side,
              groupKey: connector.groupKey,
              required: connector.required,
              normal: connector.geometry.normal ?? null,
            }))
          : (JSON.parse(portsJson) as Array<{
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
            }>)
      const result = await replaceAssetPorts(selectedAssetId, nextPorts)
      setConnectorsDraft(result.connectors)
      setSelectedConnectorKey((current) =>
        current && result.connectors.some((connector) => connector.connectorKey === current)
          ? current
          : result.connectors[0]?.connectorKey ?? null,
      )
      setPortsJson(connectorsToJson(result.connectors))
      setMessage(`已保存 ${result.connectors.length} 个连接点`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const selectedConnector = useMemo(
    () => connectorsDraft.find((connector) => connector.connectorKey === selectedConnectorKey) ?? null,
    [connectorsDraft, selectedConnectorKey],
  )

  const handleSaveBindings = async () => {
    if (!selectedAssetId) return
    setSaving(true)
    try {
      const result = await replaceAssetBindings(selectedAssetId, bindingsDraft)
      setBindingsDraft(
        result.bindings.map((binding) => ({
          bindingType: binding.bindingType,
          bindingKey: binding.bindingKey,
          bindingValue: binding.bindingValue,
          note: binding.note,
        })),
      )
      setMessage(`已保存 ${result.bindings.length} 条绑定`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async () => {
    if (!pendingFile) {
      setError('请先选择模型文件')
      return
    }
    setUploading(true)
    try {
      const result = await uploadAssetModel(pendingFile)
      setModelUpload(result.upload)
      setMessage(`模型已上传：${result.upload.fileName}`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedAssetId) return
    setSaving(true)
    try {
      const result = await publishAsset(selectedAssetId)
      setMessage(`已发布资产：${result.asset.displayName}`)
      await refreshList(selectedAssetId)
      const versions = await listAssetVersions(selectedAssetId)
      setVersionsCount(versions.items.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!selectedAssetId) return
    setSaving(true)
    try {
      const result = await archiveAsset(selectedAssetId)
      setMessage(`已下线资产：${result.asset.displayName}`)
      await refreshList(selectedAssetId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAssetId) return
    setSaving(true)
    try {
      await deleteAsset(selectedAssetId)
      setMessage('资产已删除')
      await refreshList(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="assets-page">
      <aside className="assets-sidebar">
        <section className="assets-panel">
          <h1>资产管理</h1>
          <p className="muted small">统一维护模型文件、资产配置、端口和绑定占位，再发布到设备库。</p>
          <div className="assets-create-grid">
            <label>
              <span>新资产标识</span>
              <input value={assetDraft.assetKey} onChange={(e) => setAssetDraft({ ...assetDraft, assetKey: e.target.value })} />
            </label>
            <label>
              <span>新资产名称</span>
              <input
                value={assetDraft.displayName}
                onChange={(e) => setAssetDraft({ ...assetDraft, displayName: e.target.value })}
              />
            </label>
          </div>
          <button type="button" className="primary" onClick={handleCreate} disabled={saving}>
            新建资产草稿
          </button>
        </section>
        <AssetList
          items={items}
          selectedAssetId={selectedAssetId}
          statusFilter={statusFilter}
          loading={loadingList}
          onSelectAsset={setSelectedAssetId}
          onChangeStatus={setStatusFilter}
        />
      </aside>
      <main className="assets-main">
        <section className="assets-panel assets-panel--summary">
          <div>
            <h2>{selectedItem?.displayName ?? '未选择资产'}</h2>
            <p className="muted small">
              {selectedItem
                ? `${selectedItem.assetKey} · ${selectedItem.status} · 已发布版本 ${versionsCount}`
                : '从左侧列表选择一个资产开始编辑。'}
            </p>
          </div>
          {selectedItem ? (
            <div className="assets-inline-actions">
              <button type="button" className="primary" onClick={handlePublish} disabled={saving}>
                发布
              </button>
              <button type="button" className="secondary" onClick={handleArchive} disabled={saving}>
                下线
              </button>
              <button type="button" className="secondary" onClick={handleDelete} disabled={saving}>
                删除
              </button>
            </div>
          ) : null}
        </section>
        {selectedItem ? (
          <div className="assets-editor-grid">
            <div className="assets-editor-column">
              <AssetForm value={assetDraft} disabled={saving || loadingDetail} onChange={setAssetDraft} onSave={handleSaveBasic} />
              <section className="assets-panel">
                <div className="assets-panel-header">
                  <div>
                    <h2>连接点配置</h2>
                    <p className="muted small">默认按语义编辑；高级模式支持直接粘贴 JSON。</p>
                  </div>
                  <div className="assets-inline-actions">
                    <button type="button" className={portsMode === 'table' ? 'primary' : 'secondary'} onClick={() => setPortsMode('table')}>
                      表单模式
                    </button>
                    <button type="button" className={portsMode === 'json' ? 'primary' : 'secondary'} onClick={() => setPortsMode('json')}>
                      JSON 模式
                    </button>
                    <button type="button" className="secondary" onClick={handleSavePorts} disabled={saving || loadingDetail}>
                      保存连接点
                    </button>
                  </div>
                </div>
                {portsMode === 'table' ? (
                  <div className="assets-editor-grid">
                    <div className="assets-editor-column">
                      <ConnectorList
                        connectors={connectorsDraft}
                        selectedConnectorKey={selectedConnectorKey}
                        disabled={saving || loadingDetail}
                        onSelectConnector={setSelectedConnectorKey}
                        onAddConnector={() => {
                          const nextConnector = {
                            ...createEmptyConnector(),
                            sortOrder: connectorsDraft.length,
                          }
                          setConnectorsDraft([...connectorsDraft, nextConnector])
                          setSelectedConnectorKey(nextConnector.connectorKey)
                        }}
                        onRemoveConnector={(connectorKey) => {
                          const nextConnectors = connectorsDraft
                            .filter((connector) => connector.connectorKey !== connectorKey)
                            .map((connector, index) => ({ ...connector, sortOrder: index }))
                          setConnectorsDraft(nextConnectors)
                          setSelectedConnectorKey(nextConnectors[0]?.connectorKey ?? null)
                        }}
                      />
                    </div>
                    <div className="assets-editor-column">
                      <ConnectorDetailForm
                        connector={selectedConnector}
                        disabled={saving || loadingDetail}
                        onChange={(nextConnector) => {
                          setConnectorsDraft(
                            connectorsDraft.map((connector) =>
                              connector.connectorKey === selectedConnectorKey ? nextConnector : connector,
                            ),
                          )
                          setSelectedConnectorKey(nextConnector.connectorKey)
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <label className="assets-json-editor">
                    <span>连接点 JSON</span>
                    <textarea aria-label="连接点 JSON" rows={12} value={portsJson} onChange={(e) => setPortsJson(e.target.value)} />
                  </label>
                )}
              </section>
            </div>
            <div className="assets-editor-column">
              <AssetUploadPanel
                modelUpload={modelUpload}
                selectedFileName={pendingFile?.name ?? null}
                uploading={uploading}
                onSelectFile={setPendingFile}
                onUpload={handleUpload}
              />
              <AssetBindingsEditor bindings={bindingsDraft} disabled={saving || loadingDetail} onChange={setBindingsDraft} onSave={handleSaveBindings} />
            </div>
          </div>
        ) : null}
        {message ? <section className="assets-panel assets-panel--notice"><p>{message}</p></section> : null}
        {error ? <section className="assets-panel assets-panel--error"><p>{error}</p></section> : null}
      </main>
    </div>
  )
}
