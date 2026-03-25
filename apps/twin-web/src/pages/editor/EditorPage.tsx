import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorCanvas } from '@/components/scene/EditorCanvas'
import { DevicePalette } from '@/components/panels/DevicePalette'
import { EditorCanvasHud } from '@/components/panels/EditorCanvasHud'
import { EditorDeck } from '@/components/panels/EditorDeck'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { SceneJsonToolbar } from '@/components/panels/SceneJsonToolbar'
import { loadEquipmentCatalog, type CatalogAsset, type RenderStyle } from '@/services/loadEquipmentCatalog'
import { loadCurrentSceneIntoStore } from '@/services/loadDemoScene'
import { useSceneStore } from '@/store/sceneStore'

export function EditorPage() {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [pendingPlacement, setPendingPlacement] = useState<CatalogAsset | null>(null)
  const [importedCatalog, setImportedCatalog] = useState<CatalogAsset[]>([])
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
    if (useSceneStore.getState().devices.length > 0) return
    void loadCurrentSceneIntoStore().then((result) => {
      if (!result.ok) useSceneStore.getState().setError(result.error)
    })
  }, [])

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('stress')
    if (raw == null) return
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return
    applyStressTest(Math.floor(n))
  }, [applyStressTest])

  const mergedCatalog = useMemo(() => {
    const base = catalog ?? []
    const all = [...base, ...importedCatalog]
    const map = new Map<string, CatalogAsset>()
    for (const a of all) map.set(a.assetId, a)
    return Array.from(map.values())
  }, [catalog, importedCatalog])

  const modelGlbByAssetId = useMemo(() => {
    const m: Record<string, string | null | undefined> = {}
    mergedCatalog.forEach((a) => {
      m[a.assetId] = a.modelGlbUrl ?? (a.modelGlb ? `/equipment/${a.assetId}/model.glb` : null)
    })
    return m
  }, [mergedCatalog])

  const renderStyleByAssetId = useMemo(() => {
    const m: Record<string, RenderStyle | undefined> = {}
    mergedCatalog.forEach((a) => {
      m[a.assetId] = a.renderStyle ?? 'box'
    })
    return m
  }, [mergedCatalog])

  const onImportAssets = useCallback((assets: CatalogAsset[]) => {
    setImportedCatalog((prev) => {
      const map = new Map<string, CatalogAsset>()
      for (const a of prev) map.set(a.assetId, a)
      for (const a of assets) map.set(a.assetId, a)
      return Array.from(map.values())
    })
  }, [])

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
      if (e.key === 'Home') {
        e.preventDefault()
        useSceneStore.getState().requestEditorCameraReset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="editor-root">
      <header className="editor-header">
        <h1>场景编排</h1>
        <p className="muted small">
          内部工具 · Esc 取消 · Delete 删除 · Home 重置视角
        </p>
      </header>
      <div className="editor-body">
        <DevicePalette
          catalog={mergedCatalog}
          loadError={catalogError}
          pendingPlacement={pendingPlacement}
          onSetPendingPlacement={setPendingPlacement}
          onImportAssets={onImportAssets}
        />
        <div className="editor-center">
          <main className="editor-canvas-wrap">
            <EditorCanvas
              modelUrlByAssetId={modelGlbByAssetId}
              renderStyleByAssetId={renderStyleByAssetId}
              floorPlacementActive={!!pendingPlacement}
              onFloorPlace={onFloorPlace}
            />
            <EditorCanvasHud />
          </main>
          <EditorDeck />
        </div>
        <PropertiesPanel />
      </div>
      <SceneJsonToolbar />
    </div>
  )
}
