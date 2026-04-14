type BindingDraft = {
  bindingType: 'device_identity' | 'point_mapping' | 'runtime_field'
  bindingKey: string
  bindingValue: string
  note: string
}

type Props = {
  bindings: BindingDraft[]
  disabled?: boolean
  onChange: (bindings: BindingDraft[]) => void
  onSave: () => void
}

function createEmptyBinding(): BindingDraft {
  return {
    bindingType: 'device_identity',
    bindingKey: '',
    bindingValue: '',
    note: '',
  }
}

export function AssetBindingsEditor({ bindings, disabled = false, onChange, onSave }: Props) {
  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>绑定占位</h2>
          <p className="muted small">为后续设备身份、点位映射和运行态字段绑定预留结构。</p>
        </div>
        <button type="button" className="secondary" onClick={onSave} disabled={disabled}>
          保存绑定
        </button>
      </div>
      <div className="assets-bindings">
        {bindings.map((binding, index) => (
          <div key={`${binding.bindingType}-${index}`} className="assets-binding-row">
            <select
              aria-label={`绑定类型 ${index + 1}`}
              value={binding.bindingType}
              onChange={(e) =>
                onChange(
                  bindings.map((item, rowIndex) =>
                    rowIndex === index
                      ? { ...item, bindingType: e.target.value as BindingDraft['bindingType'] }
                      : item,
                  ),
                )
              }
            >
              <option value="device_identity">device_identity</option>
              <option value="point_mapping">point_mapping</option>
              <option value="runtime_field">runtime_field</option>
            </select>
            <input
              aria-label={`绑定 key ${index + 1}`}
              placeholder="binding key"
              value={binding.bindingKey}
              onChange={(e) =>
                onChange(bindings.map((item, rowIndex) => (rowIndex === index ? { ...item, bindingKey: e.target.value } : item)))
              }
            />
            <input
              aria-label={`绑定值 ${index + 1}`}
              placeholder="binding value"
              value={binding.bindingValue}
              onChange={(e) =>
                onChange(bindings.map((item, rowIndex) => (rowIndex === index ? { ...item, bindingValue: e.target.value } : item)))
              }
            />
            <input
              aria-label={`绑定备注 ${index + 1}`}
              placeholder="note"
              value={binding.note}
              onChange={(e) =>
                onChange(bindings.map((item, rowIndex) => (rowIndex === index ? { ...item, note: e.target.value } : item)))
              }
            />
          </div>
        ))}
      </div>
      <button type="button" className="secondary" onClick={() => onChange([...bindings, createEmptyBinding()])}>
        添加绑定
      </button>
    </section>
  )
}
