import { Link } from 'react-router-dom'

type Props = {
  assetId: string
  completed: number
  total: number
  requiredRemaining: number
  publishReady: boolean
}

export function AssetConnectorProgressCard({
  assetId,
  completed,
  total,
  requiredRemaining,
  publishReady,
}: Props) {
  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>端点定位摘要</h2>
          <p className="muted small">资产页只显示进度与风险，完整定位操作在独立子页面完成。</p>
        </div>
        <Link className="primary" to={`/assets/${encodeURIComponent(assetId)}/connectors`}>
          进入端点定位
        </Link>
      </div>

      <div className="assets-progress-card">
        <div className="assets-progress-card__metric">
          <strong>{`${completed}/${total} 已完成`}</strong>
          <span className="muted small">按模板顺序逐个完成端点定位。</span>
        </div>
        <div className="assets-progress-card__chips">
          <span className="assets-chip">{`必需未完成 ${requiredRemaining}`}</span>
          <span className={`assets-chip ${publishReady ? 'assets-chip--success' : 'assets-chip--warning'}`}>
            {publishReady ? '当前可以发布' : '当前不建议发布'}
          </span>
        </div>
        <p className="muted small">
          {requiredRemaining > 0 ? `仍有 ${requiredRemaining} 个必需端点未定位` : '所有必需端点已定位，可以继续发布'}
        </p>
      </div>
    </section>
  )
}
