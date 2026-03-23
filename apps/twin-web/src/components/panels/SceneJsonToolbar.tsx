import { useRef, type ChangeEvent } from 'react'
import { useSceneStore } from '@/store/sceneStore'
import type { SnapGridOption } from '@/store/sceneStore'
import { loadDemoSceneIntoStore } from '@/services/loadDemoScene'

export function SceneJsonToolbar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const exportSceneJson = useSceneStore((s) => s.exportSceneJson)
  const importSceneJsonText = useSceneStore((s) => s.importSceneJsonText)
  const applyStressTest = useSceneStore((s) => s.applyStressTest)
  const lastError = useSceneStore((s) => s.editorUi.lastError)
  const showGrid = useSceneStore((s) => s.editorUi.showGrid)
  const showPipes = useSceneStore((s) => s.editorUi.showPipes)
  const snapGrid = useSceneStore((s) => s.editorUi.snapGrid)
  const flowEnabled = useSceneStore((s) => s.editorUi.flowEnabled)
  const setShowGrid = useSceneStore((s) => s.setShowGrid)
  const setShowPipes = useSceneStore((s) => s.setShowPipes)
  const setSnapGrid = useSceneStore((s) => s.setSnapGrid)
  const setFlowEnabled = useSceneStore((s) => s.setFlowEnabled)
  const clearError = useSceneStore((s) => s.clearError)
  const clearScene = useSceneStore((s) => s.clearScene)
  const requestEditorCameraReset = useSceneStore((s) => s.requestEditorCameraReset)

  const download = () => {
    const text = exportSceneJson()
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scene.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const text = await f.text()
    importSceneJsonText(text)
  }

  const loadDemo = async () => {
    clearError()
    const r = await loadDemoSceneIntoStore()
    if (!r.ok) useSceneStore.getState().setError(r.error)
  }

  return (
    <footer className="toolbar">
      <div className="toolbar-row">
        <button type="button" className="primary" onClick={download}>
          导出 scene.json
        </button>
        <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
          导入 JSON
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPickFile} />
        <button type="button" className="secondary" onClick={loadDemo}>
          加载示例场景
        </button>
        <button type="button" className="secondary" onClick={() => clearScene()}>
          清空场景
        </button>
        <button type="button" className="secondary" onClick={() => applyStressTest(80)}>
          压测：80 台 + 管线
        </button>
        <span className="toolbar-hint">性能基线：URL 加 <code>?stress=80</code> 启动即生成</span>
      </div>
      <div className="toolbar-row toolbar-row--secondary">
        <label className="toolbar-toggle">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          <span>显示网格</span>
        </label>
        <label className="toolbar-toggle">
          <input type="checkbox" checked={showPipes} onChange={(e) => setShowPipes(e.target.checked)} />
          <span>显示管线</span>
        </label>
        <label className="toolbar-toggle">
          <input type="checkbox" checked={flowEnabled} onChange={(e) => setFlowEnabled(e.target.checked)} />
          <span>运行态：流动</span>
        </label>
        <label className="toolbar-snap">
          <span className="toolbar-snap-label">吸附</span>
          <select
            className="toolbar-select"
            value={snapGrid}
            onChange={(e) => setSnapGrid(Number(e.target.value) as SnapGridOption)}
          >
            <option value={0}>关</option>
            <option value={0.25}>0.25 m</option>
            <option value={0.5}>0.5 m</option>
            <option value={1}>1 m</option>
          </select>
        </label>
        <button type="button" className="secondary" title="与首次进入时相同的俯视角度（快捷键 Home）" onClick={() => requestEditorCameraReset()}>
          重置视角
        </button>
      </div>
      {lastError ? (
        <div className="toolbar-error">
          <span>{lastError}</span>
          <button type="button" className="linkish" onClick={clearError}>
            关闭
          </button>
        </div>
      ) : null}
    </footer>
  )
}
