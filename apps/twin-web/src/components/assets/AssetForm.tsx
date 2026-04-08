import type { AssetMutationInput } from '@/schemas/assets'

type Props = {
  value: AssetMutationInput
  disabled?: boolean
  onChange: (next: AssetMutationInput) => void
  onSave: () => void
}

export function AssetForm({ value, disabled = false, onChange, onSave }: Props) {
  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>基础信息</h2>
          <p className="muted small">基础配置会作为资产主信息发布到设备库。</p>
        </div>
        <button type="button" className="primary" onClick={onSave} disabled={disabled}>
          保存基础信息
        </button>
      </div>
      <div className="assets-form-grid">
        <label>
          <span>资产标识</span>
          <input value={value.assetKey} onChange={(e) => onChange({ ...value, assetKey: e.target.value })} />
        </label>
        <label>
          <span>显示名称</span>
          <input value={value.displayName} onChange={(e) => onChange({ ...value, displayName: e.target.value })} />
        </label>
        <label>
          <span>类型</span>
          <input value={value.type} onChange={(e) => onChange({ ...value, type: e.target.value })} />
        </label>
        <label>
          <span>默认系统</span>
          <input value={value.defaultSystem} onChange={(e) => onChange({ ...value, defaultSystem: e.target.value })} />
        </label>
        <label>
          <span>资产版本</span>
          <input
            type="number"
            min={1}
            value={value.assetVersion}
            onChange={(e) => onChange({ ...value, assetVersion: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
        <label>
          <span>渲染风格</span>
          <select
            value={value.renderStyle}
            onChange={(e) => onChange({ ...value, renderStyle: e.target.value as AssetMutationInput['renderStyle'] })}
          >
            <option value="box">box</option>
            <option value="icosahedron">icosahedron</option>
            <option value="dodecahedron">dodecahedron</option>
            <option value="octahedron">octahedron</option>
          </select>
        </label>
      </div>
      <div className="assets-form-grid assets-form-grid--bounds">
        <label>
          <span>半尺寸 X</span>
          <input
            type="number"
            step="0.1"
            min={0.1}
            value={value.bounds.halfExtents[0]}
            onChange={(e) =>
              onChange({
                ...value,
                bounds: {
                  halfExtents: [Math.max(0.1, Number(e.target.value) || 0.1), value.bounds.halfExtents[1], value.bounds.halfExtents[2]],
                },
              })
            }
          />
        </label>
        <label>
          <span>半尺寸 Y</span>
          <input
            type="number"
            step="0.1"
            min={0.1}
            value={value.bounds.halfExtents[1]}
            onChange={(e) =>
              onChange({
                ...value,
                bounds: {
                  halfExtents: [value.bounds.halfExtents[0], Math.max(0.1, Number(e.target.value) || 0.1), value.bounds.halfExtents[2]],
                },
              })
            }
          />
        </label>
        <label>
          <span>半尺寸 Z</span>
          <input
            type="number"
            step="0.1"
            min={0.1}
            value={value.bounds.halfExtents[2]}
            onChange={(e) =>
              onChange({
                ...value,
                bounds: {
                  halfExtents: [value.bounds.halfExtents[0], value.bounds.halfExtents[1], Math.max(0.1, Number(e.target.value) || 0.1)],
                },
              })
            }
          />
        </label>
      </div>
    </section>
  )
}
