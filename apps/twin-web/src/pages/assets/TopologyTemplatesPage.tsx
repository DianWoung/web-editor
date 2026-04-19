import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ConnectorDetailForm } from '@/components/assets/ConnectorDetailForm'
import { ConnectorList } from '@/components/assets/ConnectorList'
import type { AssetConnector, TopologyTemplateMutationInput } from '@/schemas/assets'
import {
  createTopologyTemplate,
  getTopologyTemplate,
  listTopologyTemplates,
  updateTopologyTemplate,
} from '@/services/api/assetsApi'

type TemplateDraft = TopologyTemplateMutationInput & {
  id: string | null
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

function createEmptyTemplateDraft(): TemplateDraft {
  return {
    id: null,
    templateKey: '',
    displayName: '',
    category: 'water_loop',
    description: '',
    defaultSystem: 'CHW',
    connectors: [],
  }
}

function detailToDraft(detail: Awaited<ReturnType<typeof getTopologyTemplate>>): TemplateDraft {
  return {
    id: detail.id,
    templateKey: detail.templateKey,
    displayName: detail.displayName,
    category: detail.category,
    description: detail.description,
    defaultSystem: detail.defaultSystem,
    connectors: detail.connectors.map((connector) => ({
      connectorKey: connector.connectorKey,
      name: connector.name,
      system: connector.system,
      role: connector.role,
      medium: connector.medium,
      direction: connector.direction,
      required: connector.required,
      position: connector.geometry.anchor,
      normal: connector.geometry.normal ?? null,
    })),
  }
}

function draftToConnectors(draft: TemplateDraft): AssetConnector[] {
  return draft.connectors.map((connector, index) => ({
    id: connector.connectorKey,
    connectorKey: connector.connectorKey,
    portKey: connector.connectorKey,
    name: connector.name,
    system: connector.system,
    role: connector.role,
    medium: connector.medium ?? null,
    direction: connector.direction,
    side: null,
    groupKey: null,
    required: connector.required ?? false,
    sortOrder: index,
    geometry: {
      anchor: connector.position,
      normal: connector.normal ?? null,
    },
  }))
}

function connectorsToDraftConnectors(connectors: AssetConnector[]): TemplateDraft['connectors'] {
  return connectors.map((connector) => ({
    connectorKey: connector.connectorKey,
    name: connector.name,
    system: connector.system,
    role: connector.role,
    medium: connector.medium ?? null,
    direction: connector.direction,
    required: connector.required,
    position: connector.geometry.anchor,
    normal: connector.geometry.normal ?? null,
  }))
}

export function TopologyTemplatesPage() {
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof listTopologyTemplates>>['items']>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TemplateDraft>(createEmptyTemplateDraft())
  const [selectedConnectorKey, setSelectedConnectorKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connectors = useMemo(() => draftToConnectors(draft), [draft])
  const selectedConnector = useMemo(
    () => connectors.find((connector) => connector.connectorKey === selectedConnectorKey) ?? null,
    [connectors, selectedConnectorKey],
  )

  const refreshTemplates = useCallback(async (preferredTemplateId?: string | null) => {
    setLoading(true)
    try {
      const result = await listTopologyTemplates()
      setTemplates(result.items)
      setSelectedTemplateId((current) => {
        if (preferredTemplateId !== undefined) {
          return preferredTemplateId
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
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshTemplates()
  }, [refreshTemplates])

  useEffect(() => {
    if (!selectedTemplateId) {
      setDraft(createEmptyTemplateDraft())
      setSelectedConnectorKey(null)
      return
    }

    setLoading(true)
    void getTopologyTemplate(selectedTemplateId)
      .then((detail) => {
        const nextDraft = detailToDraft(detail)
        setDraft(nextDraft)
        setSelectedConnectorKey(nextDraft.connectors[0]?.connectorKey ?? null)
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setLoading(false))
  }, [selectedTemplateId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: TopologyTemplateMutationInput = {
        templateKey: draft.templateKey,
        displayName: draft.displayName,
        category: draft.category,
        description: draft.description,
        defaultSystem: draft.defaultSystem,
        connectors: draft.connectors,
      }

      const result = draft.id
        ? await updateTopologyTemplate(draft.id, payload)
        : await createTopologyTemplate(payload)

      setDraft(detailToDraft(result))
      setSelectedTemplateId(result.id)
      setSelectedConnectorKey(result.connectors[0]?.connectorKey ?? null)
      await refreshTemplates(result.id)
      setMessage(`已保存模板：${result.displayName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="assets-page">
      <aside className="assets-sidebar">
        <section className="assets-panel assets-panel--list">
          <div className="assets-panel-header">
            <div>
              <h1>连接拓扑模板库</h1>
              <p className="muted small">集中维护连接结构模板，再供资产页套用快照。</p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setSelectedTemplateId(null)
                setDraft(createEmptyTemplateDraft())
                setSelectedConnectorKey(null)
              }}
            >
              新建模板
            </button>
          </div>
          <Link className="secondary" to="/assets">
            返回资产页
          </Link>
          <div className="assets-connector-list">
            {templates.map((template) => {
              const active = template.id === selectedTemplateId
              return (
                <div key={template.id} className={`assets-connector-list-item${active ? ' is-active' : ''}`}>
                  <button
                    type="button"
                    className={active ? 'primary' : 'secondary'}
                    onClick={() => setSelectedTemplateId(template.id)}
                    disabled={loading}
                  >
                    {template.displayName}
                  </button>
                  <span className="muted small">
                    {template.defaultSystem} · {template.category} · {template.connectorCount} 个连接点
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </aside>

      <main className="assets-main">
        <section className="assets-panel">
          <div className="assets-panel-header">
            <div>
              <h2>{draft.displayName || '新模板'}</h2>
              <p className="muted small">模板页负责定义连接结构，资产页只允许轻量覆写。</p>
            </div>
            <button type="button" className="primary" onClick={handleSave} disabled={saving || loading}>
              保存模板
            </button>
          </div>

          <div className="assets-form-grid">
            <label>
              <span>模板标识</span>
              <input
                aria-label="模板标识"
                value={draft.templateKey}
                onChange={(event) => setDraft({ ...draft, templateKey: event.target.value })}
              />
            </label>
            <label>
              <span>模板名称</span>
              <input
                aria-label="模板名称"
                value={draft.displayName}
                onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
              />
            </label>
            <label>
              <span>分类</span>
              <input
                aria-label="模板分类"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              />
            </label>
            <label>
              <span>默认系统</span>
              <input
                aria-label="模板默认系统"
                value={draft.defaultSystem}
                onChange={(event) => setDraft({ ...draft, defaultSystem: event.target.value })}
              />
            </label>
          </div>

          <label className="assets-json-editor">
            <span>模板说明</span>
            <textarea
              aria-label="模板说明"
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
        </section>

        <div className="assets-editor-grid">
          <div className="assets-editor-column">
            <ConnectorList
              connectors={connectors}
              selectedConnectorKey={selectedConnectorKey}
              disabled={saving || loading}
              onSelectConnector={setSelectedConnectorKey}
              onAddConnector={() => {
                const nextConnector = { ...createEmptyConnector(), sortOrder: connectors.length }
                const nextConnectors = [...connectors, nextConnector]
                setDraft({ ...draft, connectors: connectorsToDraftConnectors(nextConnectors) })
                setSelectedConnectorKey(nextConnector.connectorKey)
              }}
              onRemoveConnector={(connectorKey) => {
                const nextConnectors = connectors
                  .filter((connector) => connector.connectorKey !== connectorKey)
                  .map((connector, index) => ({ ...connector, sortOrder: index }))
                setDraft({ ...draft, connectors: connectorsToDraftConnectors(nextConnectors) })
                setSelectedConnectorKey(nextConnectors[0]?.connectorKey ?? null)
              }}
            />
          </div>
          <div className="assets-editor-column">
            <ConnectorDetailForm
              connector={selectedConnector}
              disabled={saving || loading}
              onChange={(nextConnector) => {
                const nextConnectors = connectors.map((connector) =>
                  connector.connectorKey === selectedConnectorKey ? nextConnector : connector,
                )
                setDraft({ ...draft, connectors: connectorsToDraftConnectors(nextConnectors) })
                setSelectedConnectorKey(nextConnector.connectorKey)
              }}
            />
          </div>
        </div>

        {message ? <section className="assets-panel assets-panel--notice"><p>{message}</p></section> : null}
        {error ? <section className="assets-panel assets-panel--error"><p>{error}</p></section> : null}
      </main>
    </div>
  )
}
