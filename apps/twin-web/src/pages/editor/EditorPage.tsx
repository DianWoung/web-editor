import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorCanvas } from '@/components/scene/EditorCanvas'
import { DevicePalette } from '@/components/panels/DevicePalette'
import { EditorDeck } from '@/components/panels/EditorDeck'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { SceneJsonToolbar } from '@/components/panels/SceneJsonToolbar'
import { loadEquipmentCatalog, type CatalogAsset } from '@/services/loadEquipmentCatalog'
import { useSceneStore } from '@/store/sceneStore'

export function EditorPage() {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [pendingPlacement, setPendingPlacement] = useState<CatalogAsset | null>(null)
  const applyStressTest = useSceneStore((s) => s.applyStressTest)
  const addDeviceFromAsset = useSceneStore((s) => s.addDeviceFromAsset)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const c = await loadEquipmentCatalog()
        if (!cancelled) {
          setCatalog(c)
          setCatalogError(null)
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setCatalog(null)
          setCatalogError(e instanceof Error ? e.message : String(e))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('stress')
    if (raw == null) return
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return
    applyStressTest(Math.floor(n))
  }, [applyStressTest])

  const modelGlbByAssetId = useMemo(() => {
    const m: Record<string, boolean> = {}
    catalog?.forEach((a) => {
      m[a.assetId] = a.modelGlb
    })
    return m
  }, [catalog])

  const onFloorPlace = useCallback(
    (point: [number, number, number]) => {
      const asset = pendingPlacement
      if (!asset) return
      addDeviceFromAsset(asset, point)
      setPendingPlacement(null)
    },
    [pendingPlacement, addDeviceFromAsset],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
        return
      }
      if (e.key === 'Escape') {
        setPendingPlacement(null)
        const st = useSceneStore.getState()
        st.setSelection(null)
        st.setWireFrom(null)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const st = useSceneStore.getState()
        const sel = st.selection
        if (sel?.kind === 'device') st.removeDevice(sel.deviceId)
        else if (sel?.kind === 'pipe') st.removePipe(sel.pipeId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="editor-root">
      <header className="editor-header">
        <h1>场景编排</h1>
        <p className="muted small">内部工具 · 设备库与管线 JSON · Esc 取消 · Delete 删除选中</p>
      </header>
      <div className="editor-body">
        <DevicePalette
          catalog={catalog}
          loadError={catalogError}
          pendingPlacement={pendingPlacement}
          onSetPendingPlacement={setPendingPlacement}
        />
        <div className="editor-center">
          <main className="editor-canvas-wrap">
            <EditorCanvas
              modelGlbByAssetId={modelGlbByAssetId}
              floorPlacementActive={!!pendingPlacement}
              onFloorPlace={onFloorPlace}
            />
          </main>
          <EditorDeck />
        </div>
        <PropertiesPanel />
      </div>
      <SceneJsonToolbar />
    </div>
  )
}
