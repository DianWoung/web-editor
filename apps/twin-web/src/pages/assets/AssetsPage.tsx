import { useCallback, useEffect, useMemo, useState } from 'react'

import { AssetBindingsEditor } from '@/components/assets/AssetBindingsEditor'
import { AssetConnectorWorkbench } from '@/components/assets/AssetConnectorWorkbench'
import { AssetForm } from '@/components/assets/AssetForm'
import { AssetList } from '@/components/assets/AssetList'
import { AssetUploadPanel } from '@/components/assets/AssetUploadPanel'
import { TopologyTemplatePicker } from '@/components/assets/TopologyTemplatePicker'
import type {
  AssetBinding,
  AssetConnector,
  AssetMutationInput,
  AssetUpload,
  TopologyTemplateDetail,
} from '@/schemas/assets'
import {
  applyTopologyTemplate,
  archiveAsset,
  createAssetDraft,
  deleteAsset,
  getAssetDetail,
  getTopologyTemplate,
  listAssets,
  listAssetVersions,
  listTopologyTemplates,
  publishAsset,
  replaceAssetBindings,
  replaceAssetPorts,
  updateAsset,
  uploadAssetModel,
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

function portsToFallbackConnectors(detail: Awaited<ReturnType<typeof getAssetDetail>>): AssetConnector[] {
  return detail.ports.map((port, index) => ({
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
}

export function AssetsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [items, setItems] = useState<Awaited<ReturnType<typeof listAssets>>['items']>([])
  const [topologyTemplates, setTopologyTemplates] = useState<Awaited<ReturnType<typeof listTopologyTemplates>>['items']>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [assetDraft, setAssetDraft] = useState<AssetMutationInput>(createEmptyDraft())
  const [connectorsDraft, setConnectorsDraft] = useState<AssetConnector[]>([])
  const [connectorWorkflowMode, setConnectorWorkflowMode] = useState<'existing' | 'template'>('existing')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<TopologyTemplateDetail | null>(null)
  const [bindingsDraft, setBindingsDraft] = useState<Array<Omit<AssetBinding, 'id'>>>([])
  const [modelUpload, setModelUpload] = useState<AssetUpload | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
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

  const refreshList = useCallback(
    async (preferredAssetId?: string | null) => {
      setLoadingList(true)
      try {
        const result = await listAssets(statusFilter)
        setItems(result.items)
        setSelectedAssetId((current) => {
          if (preferredAssetId !== undefined) {
            return preferredAssetId
          }
          if (current && result.items.some((item) => item.id === current)) {
            return current
          }
          return result.items[0]?.id ?? null
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoadingList(false)
      }
    },
    [statusFilter],
  )

  const refreshTopologyTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const result = await listTopologyTemplates()
      setTopologyTemplates(result.items)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  const loadAssetDetail = useCallback(async (assetId: string) => {
    setLoadingDetail(true)
    try {
      const detail = await getAssetDetail(assetId)
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
      setConnectorsDraft(detail.connectors.length > 0 ? detail.connectors : portsToFallbackConnectors(detail))
      setConnectorWorkflowMode('existing')
      setBindingsDraft(
        detail.bindings.map((binding) => ({
          bindingType: binding.bindingType,
          bindingKey: binding.bindingKey,
          bindingValue: binding.bindingValue,
          note: binding.note,
        })),
      )
      setSelectedTemplateId(detail.asset.topologyTemplateId ?? '')
      if (detail.asset.topologyTemplateId) {
        const template = await getTopologyTemplate(detail.asset.topologyTemplateId)
        setSelectedTemplateDetail(template)
      } else {
        setSelectedTemplateDetail(null)
      }
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
      const versions = await listAssetVersions(assetId)
      setVersionsCount(versions.items.length)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  useEffect(() => {
    void refreshTopologyTemplates()
  }, [refreshTopologyTemplates])

  useEffect(() => {
    if (!selectedAssetId) {
      setAssetDraft(createEmptyDraft())
      setConnectorsDraft([])
      setConnectorWorkflowMode('existing')
      setSelectedTemplateId('')
      setSelectedTemplateDetail(null)
      setBindingsDraft([])
      setModelUpload(null)
      setVersionsCount(0)
      return
    }

    void loadAssetDetail(selectedAssetId)
  }, [loadAssetDetail, selectedAssetId])

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

  const handleApplyTemplate = async () => {
    if (!selectedAssetId || !selectedTemplateId) return
    setSaving(true)
    try {
      const result = await applyTopologyTemplate(selectedAssetId, selectedTemplateId)
      setConnectorsDraft(result.connectors)
      setConnectorWorkflowMode('template')
      setSelectedTemplateDetail(result.template)
      setItems((current) =>
        current.map((item) =>
          item.id === selectedAssetId
            ? {
                ...item,
                topologyTemplateId: result.template.id,
                topologyTemplateKey: result.template.templateKey,
                topologyTemplateName: result.template.displayName,
              }
            : item,
        ),
      )
      setMessage(`已应用模板：${result.template.displayName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) {
      setSelectedTemplateDetail(null)
      return
    }

    try {
      const detail = await getTopologyTemplate(templateId)
      setSelectedTemplateDetail(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSaveConnectors = async () => {
    if (!selectedAssetId) return
    setSaving(true)
    try {
      const result = await replaceAssetPorts(
        selectedAssetId,
        connectorsDraft.map((connector) => ({
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
      )
      setConnectorsDraft(result.connectors)
      setConnectorWorkflowMode('existing')
      setMessage(`已保存 ${result.connectors.length} 个连接点`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

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
              <input value={assetDraft.assetKey} onChange={(event) => setAssetDraft({ ...assetDraft, assetKey: event.target.value })} />
            </label>
            <label>
              <span>新资产名称</span>
              <input
                value={assetDraft.displayName}
                onChange={(event) => setAssetDraft({ ...assetDraft, displayName: event.target.value })}
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
                ? `${selectedItem.assetKey} · ${selectedItem.status} · 模板 ${selectedItem.topologyTemplateName ?? '未选择'} · 已发布版本 ${versionsCount}`
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
              <TopologyTemplatePicker
                templates={topologyTemplates}
                selectedTemplateId={selectedTemplateId}
                activeTemplateName={selectedItem.topologyTemplateName}
                previewTemplate={selectedTemplateDetail}
                disabled={saving || loadingDetail}
                loading={loadingTemplates}
                onSelectTemplate={handleSelectTemplate}
                onApplyTemplate={handleApplyTemplate}
              />
              <AssetConnectorWorkbench
                connectors={connectorsDraft}
                boundsHalfExtents={assetDraft.bounds.halfExtents}
                disabled={saving || loadingDetail}
                modelUrl={modelUpload?.publicUrl ?? selectedItem.modelUrl}
                renderStyle={assetDraft.renderStyle}
                workflowMode={connectorWorkflowMode}
                onChange={setConnectorsDraft}
                onSave={handleSaveConnectors}
              />
            </div>
            <div className="assets-editor-column">
              <AssetUploadPanel
                modelUpload={modelUpload}
                selectedFileName={pendingFile?.name ?? null}
                uploading={uploading}
                onSelectFile={setPendingFile}
                onUpload={handleUpload}
              />
              <AssetBindingsEditor
                bindings={bindingsDraft}
                disabled={saving || loadingDetail}
                onChange={setBindingsDraft}
                onSave={handleSaveBindings}
              />
            </div>
          </div>
        ) : null}
        {message ? <section className="assets-panel assets-panel--notice"><p>{message}</p></section> : null}
        {error ? <section className="assets-panel assets-panel--error"><p>{error}</p></section> : null}
      </main>
    </div>
  )
}
