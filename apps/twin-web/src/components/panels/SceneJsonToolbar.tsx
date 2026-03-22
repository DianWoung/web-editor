import { useRef, type ChangeEvent } from 'react'
import { formatSceneParseError, parseSceneJson } from '@/schemas/scene'
import { useSceneStore } from '@/store/sceneStore'

export function SceneJsonToolbar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const exportSceneJson = useSceneStore((s) => s.exportSceneJson)
  const importSceneJsonText = useSceneStore((s) => s.importSceneJsonText)
  const loadScene = useSceneStore((s) => s.loadScene)
  const applyStressTest = useSceneStore((s) => s.applyStressTest)
  const lastError = useSceneStore((s) => s.editorUi.lastError)
  const clearError = useSceneStore((s) => s.clearError)
  const clearScene = useSceneStore((s) => s.clearScene)

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
    const res = await fetch('/scenes/demo.scene.json')
    if (!res.ok) {
      useSceneStore.getState().setError(`示例场景加载失败：HTTP ${res.status}`)
      return
    }
    const json: unknown = await res.json()
    const parsed = parseSceneJson(json)
    if (!parsed.success) {
      useSceneStore.getState().setError(`示例场景校验失败：\n${formatSceneParseError(parsed.error)}`)
      return
    }
    loadScene(parsed.data)
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
