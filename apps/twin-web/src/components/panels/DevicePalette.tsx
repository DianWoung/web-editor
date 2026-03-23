import type { CatalogAsset } from '@/services/loadEquipmentCatalog'
import { useSceneStore } from '@/store/sceneStore'

type Props = {
  catalog: CatalogAsset[] | null
  loadError: string | null
  pendingPlacement: CatalogAsset | null
  onSetPendingPlacement: (asset: CatalogAsset | null) => void
}

export function DevicePalette({
  catalog,
  loadError,
  pendingPlacement,
  onSetPendingPlacement,
}: Props) {
  const addDeviceFromAsset = useSceneStore((s) => s.addDeviceFromAsset)

  return (
    <aside className="panel palette">
      <h2>设备库</h2>
      {pendingPlacement ? (
        <div className="palette-placement-banner">
          <p className="small">
            已选：<strong>{pendingPlacement.displayName}</strong>
          </p>
          <p className="muted small">在画布<strong>地面</strong>上点击以放置；或取消后改用手动加入。</p>
          <button type="button" className="secondary" onClick={() => onSetPendingPlacement(null)}>
            取消地面放置
          </button>
        </div>
      ) : null}
      {loadError ? <p className="error">{loadError}</p> : null}
      {!catalog && !loadError ? <p className="muted">加载中…</p> : null}
      <ul className="palette-list">
        {catalog?.map((a) => (
          <li key={a.assetId} className="palette-row">
            <div className="palette-row-info">
              <span className="palette-title">{a.displayName}</span>
              <span className="palette-meta">
                {a.assetId} · {a.defaultSystem}
              </span>
            </div>
            <div className="palette-row-actions">
              <button
                type="button"
                className="secondary small-btn"
                title="在原点附近加入一台"
                onClick={() => {
                  onSetPendingPlacement(null)
                  addDeviceFromAsset(a)
                }}
              >
                加入
              </button>
              <button
                type="button"
                className={pendingPlacement?.assetId === a.assetId ? 'primary small-btn' : 'secondary small-btn'}
                title="先选中，再在地面点击放置"
                onClick={() => onSetPendingPlacement(pendingPlacement?.assetId === a.assetId ? null : a)}
              >
                地面放置
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
