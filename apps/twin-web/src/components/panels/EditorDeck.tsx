import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useSceneStore } from '@/store/sceneStore'

type Tab = 'objects' | 'topology' | 'json'

export function EditorDeck() {
  const [tab, setTab] = useState<Tab>('objects')
  const { version, devices, portGroups, pipes, selection, setSelection, removePipe } = useSceneStore(
    useShallow((s) => ({
      version: s.version,
      devices: s.devices,
      portGroups: s.portGroups,
      pipes: s.pipes,
      selection: s.selection,
      setSelection: s.setSelection,
      removePipe: s.removePipe,
    })),
  )

  const jsonText = useMemo(
    () => JSON.stringify({ version, devices, portGroups, pipes }, null, 2),
    [version, devices, portGroups, pipes],
  )

  return (
    <div className="editor-deck">
      <div className="editor-deck-tabs">
        <button
          type="button"
          className={tab === 'objects' ? 'deck-tab deck-tab--on' : 'deck-tab'}
          onClick={() => setTab('objects')}
        >
          场景对象
        </button>
        <button
          type="button"
          className={tab === 'topology' ? 'deck-tab deck-tab--on' : 'deck-tab'}
          onClick={() => setTab('topology')}
        >
          连接拓扑
        </button>
        <button
          type="button"
          className={tab === 'json' ? 'deck-tab deck-tab--on' : 'deck-tab'}
          onClick={() => setTab('json')}
        >
          原始 JSON
        </button>
      </div>
      <div className="editor-deck-body">
        {tab === 'objects' ? (
          <div className="deck-scroll">
            <p className="muted small deck-hint">点击行可选中设备；管线可在 3D 中点击，或在此列表/右侧属性中删除。</p>
            <table className="deck-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>ID</th>
                  <th>系统</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr
                    key={d.id}
                    className={
                      selection?.kind === 'device' && selection.deviceId === d.id ? 'deck-row--sel' : undefined
                    }
                  >
                    <td>
                      <button type="button" className="linkish deck-link" onClick={() => setSelection({ kind: 'device', deviceId: d.id })}>
                        {d.name}
                      </button>
                    </td>
                    <td className="muted small">{d.id}</td>
                    <td>{d.system}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pipes.length > 0 ? (
              <>
                <h4 className="deck-subtitle">管线</h4>
                <ul className="deck-pipe-list">
                  {pipes.map((p) => (
                    <li
                      key={p.id}
                      className={
                        selection?.kind === 'pipe' && selection.pipeId === p.id ? 'deck-pipe--sel' : undefined
                      }
                    >
                      <button type="button" className="linkish deck-link" onClick={() => setSelection({ kind: 'pipe', pipeId: p.id })}>
                        {p.from} → {p.to}
                      </button>
                      <button type="button" className="secondary tiny-btn" onClick={() => removePipe(p.id)}>
                        删
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
        {tab === 'topology' ? (
          <div className="deck-scroll">
            {pipes.length === 0 ? (
              <p className="muted small">暂无管线，请在 3D 中连接两个端口。</p>
            ) : (
              <ol className="deck-topology">
                {pipes.map((p) => (
                  <li key={p.id}>
                    <code>{p.from}</code>
                    <span className="topology-arrow"> → </span>
                    <code>{p.to}</code>
                    <span className="muted small"> · {p.system}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
        {tab === 'json' ? (
          <textarea className="deck-json" readOnly value={jsonText} spellCheck={false} aria-label="场景 JSON 预览" />
        ) : null}
      </div>
    </div>
  )
}
