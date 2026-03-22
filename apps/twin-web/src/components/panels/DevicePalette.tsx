import type { CatalogAsset } from '@/services/loadEquipmentCatalog'
import { useSceneStore } from '@/store/sceneStore'

type Props = {
  catalog: CatalogAsset[] | null
  loadError: string | null
}

export function DevicePalette({ catalog, loadError }: Props) {
  const addDeviceFromAsset = useSceneStore((s) => s.addDeviceFromAsset)

  return (
    <aside className="panel palette">
      <h2>设备库</h2>
      {loadError ? <p className="error">{loadError}</p> : null}
      {!catalog && !loadError ? <p className="muted">加载中…</p> : null}
      <ul className="palette-list">
        {catalog?.map((a) => (
          <li key={a.assetId}>
            <button type="button" className="palette-item" onClick={() => addDeviceFromAsset(a)}>
              <span className="palette-title">{a.displayName}</span>
              <span className="palette-meta">
                {a.assetId} · {a.defaultSystem}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
