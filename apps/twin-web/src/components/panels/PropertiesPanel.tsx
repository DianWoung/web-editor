import { useSceneStore } from '@/store/sceneStore'
import type { SnapGridOption } from '@/store/sceneStore'

export function PropertiesPanel() {
  const devices = useSceneStore((s) => s.devices)
  const pipes = useSceneStore((s) => s.pipes)
  const selection = useSceneStore((s) => s.selection)
  const transformMode = useSceneStore((s) => s.editorUi.transformMode)
  const wireFrom = useSceneStore((s) => s.editorUi.wireFrom)
  const snapGrid = useSceneStore((s) => s.editorUi.snapGrid)
  const setTransformMode = useSceneStore((s) => s.setTransformMode)
  const setWireFrom = useSceneStore((s) => s.setWireFrom)
  const setSnapGrid = useSceneStore((s) => s.setSnapGrid)
  const updateDeviceTransform = useSceneStore((s) => s.updateDeviceTransform)
  const updateDeviceName = useSceneStore((s) => s.updateDeviceName)
  const updateDeviceSystem = useSceneStore((s) => s.updateDeviceSystem)
  const removeDevice = useSceneStore((s) => s.removeDevice)
  const duplicateDevice = useSceneStore((s) => s.duplicateDevice)
  const removePipe = useSceneStore((s) => s.removePipe)

  if (selection?.kind === 'pipe') {
    const pipe = pipes.find((p) => p.id === selection.pipeId)
    if (!pipe) {
      return (
        <aside className="panel props">
          <h2>属性</h2>
          <p className="muted">管线不存在或已删除。</p>
        </aside>
      )
    }
    return (
      <aside className="panel props">
        <h2>管线</h2>
        <label className="field">
          <span>ID</span>
          <input value={pipe.id} readOnly />
        </label>
        <label className="field">
          <span>起点</span>
          <input value={pipe.from} readOnly />
        </label>
        <label className="field">
          <span>终点</span>
          <input value={pipe.to} readOnly />
        </label>
        <label className="field">
          <span>系统</span>
          <input value={pipe.system} readOnly />
        </label>
        <section className="props-section">
          <button type="button" className="secondary danger-outline" onClick={() => removePipe(pipe.id)}>
            删除此管线
          </button>
        </section>
      </aside>
    )
  }

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
        <p className="muted">选中设备或管线以编辑；也可在底部「场景对象」列表中点选。</p>
        <section className="props-section">
          <h3>吸附网格</h3>
          <select
            className="field-select"
            value={snapGrid}
            onChange={(e) => setSnapGrid(Number(e.target.value) as SnapGridOption)}
          >
            <option value={0}>关闭</option>
            <option value={0.25}>0.25 m</option>
            <option value={0.5}>0.5 m</option>
            <option value={1}>1 m</option>
          </select>
        </section>
        <section className="props-section">
          <h3>连线</h3>
          <p className="muted small">
            端口起点：{wireFrom ? `${wireFrom.deviceId}.${wireFrom.portId}` : '未选择'}
          </p>
          <button type="button" className="secondary" disabled={!wireFrom} onClick={() => setWireFrom(null)}>
            清除端口起点
          </button>
        </section>
        <p className="muted small props-shortcuts">快捷键：Delete 删除选中 · Esc 取消选择/放置</p>
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
      <label className="field">
        <span>系统归属</span>
        <input value={device.system} onChange={(e) => updateDeviceSystem(device.id, e.target.value)} />
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
        <h3>旋转（度 · XYZ）</h3>
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
        <h3>吸附</h3>
        <select
          className="field-select"
          value={snapGrid}
          onChange={(e) => setSnapGrid(Number(e.target.value) as SnapGridOption)}
        >
          <option value={0}>关闭</option>
          <option value={0.25}>0.25 m</option>
          <option value={0.5}>0.5 m</option>
          <option value={1}>1 m</option>
        </select>
      </section>
      <section className="props-section">
        <h3>对象操作</h3>
        <div className="btn-row btn-row--wrap">
          <button type="button" className="secondary" onClick={() => duplicateDevice(device.id)}>
            复制实例
          </button>
          <button type="button" className="secondary danger-outline" onClick={() => removeDevice(device.id)}>
            删除设备
          </button>
        </div>
      </section>
      <section className="props-section">
        <h3>连线</h3>
        <p className="muted small">
          端口起点：{wireFrom ? `${wireFrom.deviceId}.${wireFrom.portId}` : '未选择'}
        </p>
        <button type="button" className="secondary" disabled={!wireFrom} onClick={() => setWireFrom(null)}>
          清除端口起点
        </button>
      </section>
      <p className="muted small props-shortcuts">Delete 删除 · Esc 取消</p>
    </aside>
  )
}
