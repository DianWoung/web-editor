import type { TopologyTemplateDetail, TopologyTemplateListItem } from '@/schemas/assets'

type Props = {
  templates: TopologyTemplateListItem[]
  selectedTemplateId: string
  activeTemplateName?: string | null
  previewTemplate: TopologyTemplateDetail | null
  disabled?: boolean
  loading?: boolean
  onSelectTemplate: (templateId: string) => void
  onApplyTemplate: () => void
}

export function TopologyTemplatePicker({
  templates,
  selectedTemplateId,
  activeTemplateName = null,
  previewTemplate,
  disabled = false,
  loading = false,
  onSelectTemplate,
  onApplyTemplate,
}: Props) {
  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>连接拓扑模板</h2>
          <p className="muted small">先选择标准拓扑，再生成资产自己的连接点快照。</p>
        </div>
        <button type="button" className="primary" onClick={onApplyTemplate} disabled={disabled || !selectedTemplateId}>
          应用模板
        </button>
      </div>

      <label className="assets-template-picker">
        <span>连接拓扑模板</span>
        <select
          aria-label="连接拓扑模板"
          value={selectedTemplateId}
          disabled={disabled || loading}
          onChange={(event) => onSelectTemplate(event.target.value)}
        >
          <option value="">请选择模板</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.displayName}
            </option>
          ))}
        </select>
      </label>

      <div className="assets-template-summary">
        <div className="assets-template-summary-header">
          <strong>{previewTemplate?.displayName ?? activeTemplateName ?? '未选择模板'}</strong>
          {previewTemplate ? <span className="assets-chip">{previewTemplate.category}</span> : null}
        </div>
        <p className="muted small">
          {previewTemplate?.description ?? '模板决定连接结构，资产端只覆写名称和必需。'}
        </p>
        {previewTemplate ? (
          <div className="assets-template-meta">
            <span className="assets-chip">{previewTemplate.defaultSystem}</span>
            <span className="assets-chip">{previewTemplate.connectors.length} 个连接点</span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
