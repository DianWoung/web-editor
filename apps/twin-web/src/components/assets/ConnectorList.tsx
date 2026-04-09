import type { AssetConnector } from '@/schemas/assets'

type Props = {
  connectors: AssetConnector[]
  selectedConnectorKey: string | null
  disabled?: boolean
  onSelectConnector: (connectorKey: string) => void
  onAddConnector: () => void
  onRemoveConnector: (connectorKey: string) => void
}

export function ConnectorList({
  connectors,
  selectedConnectorKey,
  disabled = false,
  onSelectConnector,
  onAddConnector,
  onRemoveConnector,
}: Props) {
  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>连接点列表</h2>
          <p className="muted small">先定义连接语义，再按需要微调几何锚点和法向。</p>
        </div>
        <button type="button" className="secondary" onClick={onAddConnector} disabled={disabled}>
          新增连接点
        </button>
      </div>
      <div className="assets-connector-list">
        {connectors.map((connector) => {
          const active = connector.connectorKey === selectedConnectorKey
          return (
            <div key={connector.connectorKey} className={`assets-connector-list-item${active ? ' is-active' : ''}`}>
              <button
                type="button"
                className={active ? 'primary' : 'secondary'}
                onClick={() => onSelectConnector(connector.connectorKey)}
                disabled={disabled}
              >
                {connector.name} · {connector.role}
              </button>
              <span className="muted small">
                {connector.system} · {connector.direction} · {connector.side ?? '未分侧'}
              </span>
              <button
                type="button"
                className="secondary"
                onClick={() => onRemoveConnector(connector.connectorKey)}
                disabled={disabled}
              >
                删除
              </button>
            </div>
          )
        })}
        {connectors.length === 0 ? <p className="muted small">暂无连接点，先新增一个。</p> : null}
      </div>
    </section>
  )
}
