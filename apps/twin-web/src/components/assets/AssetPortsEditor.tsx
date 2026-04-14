import { useMemo } from 'react'

type EditablePort = {
  portKey: string
  name: string
  position: [number, number, number]
  system: string
  direction: string
}

type Props = {
  mode: 'table' | 'json'
  ports: EditablePort[]
  jsonValue: string
  disabled?: boolean
  onChangeMode: (mode: 'table' | 'json') => void
  onChangePorts: (ports: EditablePort[]) => void
  onChangeJson: (value: string) => void
  onSave: () => void
}

function createEmptyPort(): EditablePort {
  return {
    portKey: `port_${Math.random().toString(36).slice(2, 6)}`,
    name: '新端口',
    position: [0, 0, 0],
    system: 'CHW',
    direction: 'in',
  }
}

export function AssetPortsEditor({
  mode,
  ports,
  jsonValue,
  disabled = false,
  onChangeMode,
  onChangePorts,
  onChangeJson,
  onSave,
}: Props) {
  const rows = useMemo(() => ports, [ports])

  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>端口配置</h2>
          <p className="muted small">默认用表格编辑；高级模式支持直接粘贴 JSON。</p>
        </div>
        <div className="assets-inline-actions">
          <button type="button" className={mode === 'table' ? 'primary' : 'secondary'} onClick={() => onChangeMode('table')}>
            表格模式
          </button>
          <button type="button" className={mode === 'json' ? 'primary' : 'secondary'} onClick={() => onChangeMode('json')}>
            JSON 模式
          </button>
          <button type="button" className="secondary" onClick={onSave} disabled={disabled}>
            保存端口
          </button>
        </div>
      </div>
      {mode === 'table' ? (
        <>
          <table className="assets-table">
            <thead>
              <tr>
                <th>portKey</th>
                <th>名称</th>
                <th>X</th>
                <th>Y</th>
                <th>Z</th>
                <th>系统</th>
                <th>方向</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((port, index) => (
                <tr key={`${port.portKey}-${index}`}>
                  <td>
                    <input
                      aria-label={`端口 key ${index + 1}`}
                      value={port.portKey}
                      onChange={(e) =>
                        onChangePorts(rows.map((item, rowIndex) => (rowIndex === index ? { ...item, portKey: e.target.value } : item)))
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`端口名称 ${index + 1}`}
                      value={port.name}
                      onChange={(e) =>
                        onChangePorts(rows.map((item, rowIndex) => (rowIndex === index ? { ...item, name: e.target.value } : item)))
                      }
                    />
                  </td>
                  {port.position.map((value, axisIndex) => (
                    <td key={axisIndex}>
                      <input
                        type="number"
                        step="0.1"
                        aria-label={`端口坐标 ${index + 1}-${axisIndex + 1}`}
                        value={value}
                        onChange={(e) =>
                          onChangePorts(
                            rows.map((item, rowIndex) =>
                              rowIndex === index
                                ? {
                                    ...item,
                                    position: item.position.map((point, pointIndex) =>
                                      pointIndex === axisIndex ? Number(e.target.value) || 0 : point,
                                    ) as [number, number, number],
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      aria-label={`端口系统 ${index + 1}`}
                      value={port.system}
                      onChange={(e) =>
                        onChangePorts(rows.map((item, rowIndex) => (rowIndex === index ? { ...item, system: e.target.value } : item)))
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`端口方向 ${index + 1}`}
                      value={port.direction}
                      onChange={(e) =>
                        onChangePorts(rows.map((item, rowIndex) => (rowIndex === index ? { ...item, direction: e.target.value } : item)))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" onClick={() => onChangePorts([...rows, createEmptyPort()])}>
            添加端口
          </button>
        </>
      ) : (
        <label className="assets-json-editor">
          <span>端口 JSON</span>
          <textarea aria-label="端口 JSON" rows={12} value={jsonValue} onChange={(e) => onChangeJson(e.target.value)} />
        </label>
      )}
    </section>
  )
}
