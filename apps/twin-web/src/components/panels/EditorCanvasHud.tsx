import { useSceneStore } from '@/store/sceneStore'

/** 画布内浮层：连线中的状态提示（不挡 Orbit，仅展示） */
export function EditorCanvasHud() {
  const wireFrom = useSceneStore((s) => s.editorUi.wireFrom)
  const devices = useSceneStore((s) => s.devices)
  const portGroups = useSceneStore((s) => s.portGroups)
  const deviceCount = devices.length
  const pipeCount = useSceneStore((s) => s.pipes.length)

  const wireLabel = (() => {
    if (!wireFrom) return null
    const dev = devices.find((d) => d.id === wireFrom.deviceId)
    const pg = portGroups.find((g) => g.deviceId === wireFrom.deviceId)
    const port = pg?.ports.find((p) => p.id === wireFrom.portId)
    const ref = `${wireFrom.deviceId}.${wireFrom.portId}`
    if (port) {
      return `${dev?.name ?? wireFrom.deviceId} · ${port.name}（${port.id}）`
    }
    return ref
  })()

  return (
    <>
      <div className="editor-canvas-hud-stats" aria-live="polite">
        {deviceCount} 台设备 · {pipeCount} 条管线
      </div>
      {wireLabel ? (
        <div className="editor-canvas-banner editor-canvas-banner--wire" role="status">
          <span className="editor-canvas-banner__title">连线中</span>
          <span className="editor-canvas-banner__main">起点：{wireLabel}</span>
          <span className="editor-canvas-banner__hint muted">点击另一端口完成 · Esc 取消</span>
        </div>
      ) : null}
    </>
  )
}
