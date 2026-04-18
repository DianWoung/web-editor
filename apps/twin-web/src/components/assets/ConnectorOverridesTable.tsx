import type { AssetConnector } from '@/schemas/assets'

type Props = {
  connectors: AssetConnector[]
  disabled?: boolean
  onChange: (connectors: AssetConnector[]) => void
  onSave: () => void
}

export function ConnectorOverridesTable({ connectors, disabled = false, onChange, onSave }: Props) {
  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>连接点覆写</h2>
          <p className="muted small">只允许修改名称和必需，其余字段由拓扑模板控制。</p>
        </div>
        <button type="button" className="secondary" onClick={onSave} disabled={disabled || connectors.length === 0}>
          保存连接点
        </button>
      </div>

      {connectors.length === 0 ? (
        <p className="muted small">先应用一个连接拓扑模板，再配置覆写字段。</p>
      ) : (
        <table className="assets-table assets-table--overrides">
          <thead>
            <tr>
              <th>连接点 key</th>
              <th>名称</th>
              <th>系统</th>
              <th>角色</th>
              <th>介质</th>
              <th>方向</th>
              <th>必需</th>
            </tr>
          </thead>
          <tbody>
            {connectors.map((connector, index) => (
              <tr key={connector.connectorKey}>
                <td>
                  <span className="assets-cell-label">{connector.connectorKey}</span>
                </td>
                <td>
                  <input
                    aria-label={`连接点名称 ${index + 1}`}
                    value={connector.name}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(
                        connectors.map((item, rowIndex) =>
                          rowIndex === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </td>
                <td><span className="assets-chip">{connector.system}</span></td>
                <td><span className="assets-chip">{connector.role}</span></td>
                <td><span className="assets-chip">{connector.medium ?? '未设置'}</span></td>
                <td><span className="assets-chip">{connector.direction}</span></td>
                <td>
                  <label className="assets-checkbox assets-checkbox--inline">
                    <input
                      type="checkbox"
                      aria-label={`连接点必需 ${index + 1}`}
                      checked={connector.required}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(
                          connectors.map((item, rowIndex) =>
                            rowIndex === index ? { ...item, required: event.target.checked } : item,
                          ),
                        )
                      }
                    />
                    <span>必需</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
