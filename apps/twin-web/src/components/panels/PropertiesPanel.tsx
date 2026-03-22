import { useSceneStore } from '@/store/sceneStore'

export function PropertiesPanel() {
  const devices = useSceneStore((s) => s.devices)
  const selection = useSceneStore((s) => s.selection)
  const transformMode = useSceneStore((s) => s.editorUi.transformMode)
  const wireFrom = useSceneStore((s) => s.editorUi.wireFrom)
  const setTransformMode = useSceneStore((s) => s.setTransformMode)
  const setWireFrom = useSceneStore((s) => s.setWireFrom)
  const updateDeviceTransform = useSceneStore((s) => s.updateDeviceTransform)
  const updateDeviceName = useSceneStore((s) => s.updateDeviceName)

  const device =
    selection?.kind === 'device'
      ? devices.find((d) => d.id === selection.deviceId)
      : selection?.kind === 'port'
        ? devices.find((d) => d.id === selection.deviceId)
        : null

  if (!device) {
    return (
      <aside className="panel props">
        <h2>属性</h2>
        <p className="muted">选中一台设备以编辑位姿与名称。</p>
        <section className="props-section">
          <h3>连线</h3>
          <p className="muted small">
            点击端口 A 再点端口 B 创建管线。当前起点：
            {wireFrom ? `${wireFrom.deviceId}.${wireFrom.portId}` : '未选择'}
          </p>
          <button type="button" className="secondary" disabled={!wireFrom} onClick={() => setWireFrom(null)}>
            清除端口起点
          </button>
        </section>
      </aside>
    )
  }

  const setPos = (i: 0 | 1 | 2, v: number) => {
    const next: [number, number, number] = [...device.position] as [number, number, number]
    next[i] = v
    updateDeviceTransform(device.id, next, device.rotation)
  }

  const setRot = (i: 0 | 1 | 2, v: number) => {
    const next: [number, number, number] = [...device.rotation] as [number, number, number]
    next[i] = v
    updateDeviceTransform(device.id, device.position, next)
  }

  return (
    <aside className="panel props">
      <h2>属性</h2>
      <label className="field">
        <span>名称</span>
        <input value={device.name} onChange={(e) => updateDeviceName(device.id, e.target.value)} />
      </label>
      <label className="field">
        <span>ID</span>
        <input value={device.id} readOnly />
      </label>
      <section className="props-section">
        <h3>位置（米）</h3>
        <div className="vec3">
          <label>
            X
            <input
              type="number"
              step={0.1}
              value={device.position[0]}
              onChange={(e) => setPos(0, Number(e.target.value))}
            />
          </label>
          <label>
            Y
            <input
              type="number"
              step={0.1}
              value={device.position[1]}
              onChange={(e) => setPos(1, Number(e.target.value))}
            />
          </label>
          <label>
            Z
            <input
              type="number"
              step={0.1}
              value={device.position[2]}
              onChange={(e) => setPos(2, Number(e.target.value))}
            />
          </label>
        </div>
      </section>
      <section className="props-section">
        <h3>旋转（度 · XYZ 顺序）</h3>
        <div className="vec3">
          <label>
            Rx
            <input
              type="number"
              step={1}
              value={device.rotation[0]}
              onChange={(e) => setRot(0, Number(e.target.value))}
            />
          </label>
          <label>
            Ry
            <input
              type="number"
              step={1}
              value={device.rotation[1]}
              onChange={(e) => setRot(1, Number(e.target.value))}
            />
          </label>
          <label>
            Rz
            <input
              type="number"
              step={1}
              value={device.rotation[2]}
              onChange={(e) => setRot(2, Number(e.target.value))}
            />
          </label>
        </div>
      </section>
      <section className="props-section">
        <h3>变换控件</h3>
        <div className="btn-row">
          <button
            type="button"
            className={transformMode === 'translate' ? 'primary' : 'secondary'}
            onClick={() => setTransformMode('translate')}
          >
            移动
          </button>
          <button
            type="button"
            className={transformMode === 'rotate' ? 'primary' : 'secondary'}
            onClick={() => setTransformMode('rotate')}
          >
            旋转
          </button>
        </div>
      </section>
      <section className="props-section">
        <h3>连线</h3>
        <p className="muted small">
          端口起点：{wireFrom ? `${wireFrom.deviceId}.${wireFrom.portId}` : '未选择（点选第一个端口）'}
        </p>
        <button type="button" className="secondary" disabled={!wireFrom} onClick={() => setWireFrom(null)}>
          清除端口起点
        </button>
      </section>
    </aside>
  )
}
