import type { AssetListItem } from '@/schemas/assets'

type Props = {
  items: AssetListItem[]
  selectedAssetId: string | null
  statusFilter: 'all' | 'draft' | 'published' | 'archived'
  loading: boolean
  onSelectAsset: (assetId: string) => void
  onChangeStatus: (status: 'all' | 'draft' | 'published' | 'archived') => void
}

export function AssetList({ items, selectedAssetId, statusFilter, loading, onSelectAsset, onChangeStatus }: Props) {
  return (
    <section className="assets-panel assets-panel--list">
      <div className="assets-panel-header">
        <div>
          <h2>资产列表</h2>
          <p className="muted small">草稿、已发布和已下线资产统一管理。</p>
        </div>
        {loading ? <span className="toolbar-hint">读取中…</span> : null}
      </div>
      <label className="assets-filter">
        <span>状态筛选</span>
        <select value={statusFilter} onChange={(e) => onChangeStatus(e.target.value as Props['statusFilter'])}>
          <option value="all">全部</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已下线</option>
        </select>
      </label>
      <ul className="assets-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`assets-list-item${item.id === selectedAssetId ? ' assets-list-item--active' : ''}`}
              onClick={() => onSelectAsset(item.id)}
            >
              <strong>{item.displayName}</strong>
              <span className="toolbar-hint">
                {item.assetKey} · {item.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && !loading ? <p className="toolbar-hint">当前筛选下还没有资产。</p> : null}
    </section>
  )
}
