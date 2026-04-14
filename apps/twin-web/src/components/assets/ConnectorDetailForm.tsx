import type { AssetConnector } from '@/schemas/assets'

type Props = {
  connector: AssetConnector | null
  disabled?: boolean
  onChange: (connector: AssetConnector) => void
}

function updateAnchor(
  connector: AssetConnector,
  axisIndex: number,
  value: number,
) {
  return {
    ...connector,
    geometry: {
      ...connector.geometry,
      anchor: connector.geometry.anchor.map((point, index) => (index === axisIndex ? value : point)) as [
        number,
        number,
        number,
      ],
    },
  }
}

function updateNormal(
  connector: AssetConnector,
  axisIndex: number,
  value: number,
) {
  const current = connector.geometry.normal ?? [0, 0, 1]
  return {
    ...connector,
    geometry: {
      ...connector.geometry,
      normal: current.map((point, index) => (index === axisIndex ? value : point)) as [number, number, number],
    },
  }
}

export function ConnectorDetailForm({ connector, disabled = false, onChange }: Props) {
  if (!connector) {
    return (
      <section className="assets-panel">
        <h2>连接点详情</h2>
        <p className="muted small">从左侧选择一个连接点开始编辑。</p>
      </section>
    )
  }

  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>连接点详情</h2>
          <p className="muted small">默认编辑业务语义，几何参数放在下方高级区域。</p>
        </div>
      </div>
      <div className="assets-form-grid">
        <label>
          <span>连接点 key</span>
          <input
            aria-label="连接点 key"
            value={connector.connectorKey}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, connectorKey: e.target.value, portKey: e.target.value, id: e.target.value })}
          />
        </label>
        <label>
          <span>连接点名称</span>
          <input
            aria-label="连接点名称"
            value={connector.name}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, name: e.target.value })}
          />
        </label>
        <label>
          <span>系统</span>
          <input
            aria-label="连接点系统"
            value={connector.system}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, system: e.target.value })}
          />
        </label>
        <label>
          <span>连接点角色</span>
          <input
            aria-label="连接点角色"
            value={connector.role}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, role: e.target.value })}
          />
        </label>
        <label>
          <span>介质</span>
          <input
            aria-label="连接点介质"
            value={connector.medium ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, medium: e.target.value || null })}
          />
        </label>
        <label>
          <span>方向</span>
          <input
            aria-label="连接点方向"
            value={connector.direction}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, direction: e.target.value })}
          />
        </label>
        <label>
          <span>侧别</span>
          <input
            aria-label="连接点侧别"
            value={connector.side ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, side: e.target.value || null })}
          />
        </label>
        <label>
          <span>分组 key</span>
          <input
            aria-label="连接点分组"
            value={connector.groupKey ?? ''}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, groupKey: e.target.value || null })}
          />
        </label>
        <label className="assets-checkbox">
          <input
            type="checkbox"
            aria-label="连接点必填"
            checked={connector.required}
            disabled={disabled}
            onChange={(e) => onChange({ ...connector, required: e.target.checked })}
          />
          <span>必需连接点</span>
        </label>
      </div>

      <div className="assets-subsection">
        <h3>高级几何</h3>
        <div className="assets-form-grid">
          {connector.geometry.anchor.map((value, axisIndex) => (
            <label key={`anchor-${axisIndex}`}>
              <span>锚点 {['X', 'Y', 'Z'][axisIndex]}</span>
              <input
                type="number"
                step="0.1"
                aria-label={`连接点锚点 ${['X', 'Y', 'Z'][axisIndex]}`}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(updateAnchor(connector, axisIndex, Number(e.target.value) || 0))}
              />
            </label>
          ))}
          {(['X', 'Y', 'Z'] as const).map((axisLabel, axisIndex) => (
            <label key={`normal-${axisLabel}`}>
              <span>法向 {axisLabel}</span>
              <input
                type="number"
                step="0.1"
                aria-label={`连接点法向 ${axisLabel}`}
                value={connector.geometry.normal?.[axisIndex] ?? 0}
                disabled={disabled}
                onChange={(e) => onChange(updateNormal(connector, axisIndex, Number(e.target.value) || 0))}
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
