import { useEffect, useMemo, useState } from 'react'
import { EditorCanvas } from '@/components/scene/EditorCanvas'
import { DevicePalette } from '@/components/panels/DevicePalette'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { SceneJsonToolbar } from '@/components/panels/SceneJsonToolbar'
import { loadEquipmentCatalog } from '@/services/loadEquipmentCatalog'
import { useSceneStore } from '@/store/sceneStore'

export function EditorPage() {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const applyStressTest = useSceneStore((s) => s.applyStressTest)

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

  return (
    <div className="editor-root">
      <header className="editor-header">
        <h1>机房场景编排器</h1>
        <p className="muted small">阶段 1 MVP · React Three Fiber</p>
      </header>
      <div className="editor-body">
        <DevicePalette catalog={catalog} loadError={catalogError} />
        <main className="editor-canvas-wrap">
          <EditorCanvas modelGlbByAssetId={modelGlbByAssetId} />
        </main>
        <PropertiesPanel />
      </div>
      <SceneJsonToolbar />
    </div>
  )
}
