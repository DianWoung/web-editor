import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SceneSubspaceShell } from '@/components/layout/SceneSubspaceShell'
import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
import { EditorCanvas } from '@/components/scene/EditorCanvas'
import { DevicePalette } from '@/components/panels/DevicePalette'
import { EditorCanvasHud } from '@/components/panels/EditorCanvasHud'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'
import { loadEquipmentCatalog, type CatalogAsset, type RenderStyle } from '@/services/loadEquipmentCatalog'
import {
  listNamedScenes,
  loadCurrentSceneIntoStore,
  loadNamedSceneIntoStore,
  saveCurrentSceneFromStore,
  saveNamedSceneFromStore,
} from '@/services/loadDemoScene'
import { useEditorUiStore } from '@/store/editorUiStore'
import { useSceneStore } from '@/store/sceneStore'

export function EditorPage() {
  const [searchParams] = useSearchParams()
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadEquipmentCatalog>> | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [pendingPlacement, setPendingPlacement] = useState<CatalogAsset | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [sceneName, setSceneName] = useState('')
  const [sceneRemark, setSceneRemark] = useState('')
  const applyStressTest = useSceneStore((s) => s.applyStressTest)
  const addDeviceFromAsset = useSceneStore((s) => s.addDeviceFromAsset)
  const canUndo = useSceneStore((s) => s.canUndo)
  const undo = useSceneStore((s) => s.undo)
  const sceneId = searchParams.get('sceneId')
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
    if (!sceneId && useSceneStore.getState().devices.length > 0) return
    const loader = sceneId ? loadNamedSceneIntoStore(sceneId) : loadCurrentSceneIntoStore()
    void loader.then((result) => {
      if (!result.ok) useEditorUiStore.getState().setError(result.error)
    })
  }, [sceneId])

  useEffect(() => {
    let cancelled = false
    if (!sceneId) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setSceneName('')
          setSceneRemark('')
        }
      })
      return () => {
        cancelled = true
      }
    }
    void listNamedScenes().then((result) => {
      if (cancelled || !result.ok) {
        return
      }
      const matched = result.data.items.find((item) => item.id === sceneId)
      if (!matched) {
        return
      }
      setSceneName(matched.name)
      setSceneRemark(matched.remark)
    })
    return () => {
      cancelled = true
    }
  }, [sceneId])

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('stress')
    if (raw == null) return
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return
    applyStressTest(Math.floor(n))
  }, [applyStressTest])

  const mergedCatalog = useMemo(() => catalog ?? [], [catalog])

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
        useEditorUiStore.getState().setWireFrom(null)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const st = useSceneStore.getState()
        const sel = st.selection
        if (sel?.kind === 'device') st.removeDevice(sel.deviceId)
        else if (sel?.kind === 'pipe') st.removePipe(sel.pipeId)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        useSceneStore.getState().undo()
      }
      if (e.key === 'Home') {
        e.preventDefault()
        useEditorUiStore.getState().requestEditorCameraReset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const saveScene = useCallback(async () => {
    setSaveStatus(null)
    useEditorUiStore.getState().clearError()
    const result =
      sceneId
        ? await saveNamedSceneFromStore(sceneId, sceneName.trim() || '未命名场景', sceneRemark.trim())
        : await saveCurrentSceneFromStore()
    if (!result.ok) {
      useEditorUiStore.getState().setError(result.error)
      return
    }
    setSaveStatus(`${sceneId ? '命名场景已保存' : '已保存'} ${new Date(result.data.updatedAt).toLocaleTimeString()}`)
  }, [sceneId, sceneName, sceneRemark])

  const title = sceneName.trim() || (sceneId ? '未命名场景' : '当前工作场景')

  return (
    <SceneSubspaceShell
      className="editor-root"
      header={
        <SceneWorkspaceHeader
          eyebrow="场景工作区"
          title={title}
          description="处理场景编排、对象属性与名称备注。"
          actions={
            <>
              {saveStatus ? <span className="toolbar-hint">{saveStatus}</span> : null}
              <button type="button" className="primary" onClick={() => void saveScene()}>
                保存
              </button>
              <button type="button" className="secondary" onClick={() => undo()} disabled={!canUndo}>
                撤销
              </button>
              <Link className="secondary scene-link-button" to="/scenes">
                返回场景工作台
              </Link>
            </>
          }
        >
          <div className="scene-workspace-form-row">
            <label className="scene-workspace-field">
              <span>场景名称</span>
              <input
                aria-label="场景名称"
                className="toolbar-input"
                value={sceneName}
                onChange={(event) => setSceneName(event.target.value)}
                placeholder="场景名称"
              />
            </label>
            <label className="scene-workspace-field">
              <span>场景备注</span>
              <input
                aria-label="场景备注"
                className="toolbar-input"
                value={sceneRemark}
                onChange={(event) => setSceneRemark(event.target.value)}
                placeholder="场景备注"
              />
            </label>
            <span className="toolbar-hint">Esc 取消 · Delete 删除 · Home 重置视角</span>
          </div>
        </SceneWorkspaceHeader>
      }
      stage={
        <div className="editor-body editor-body--saas">
          <DevicePalette
            catalog={mergedCatalog}
            loadError={catalogError}
            pendingPlacement={pendingPlacement}
            onSetPendingPlacement={setPendingPlacement}
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
          </div>
          <PropertiesPanel />
        </div>
      }
      stageClassName="scene-subspace__stage--editor"
    />
  )
}
