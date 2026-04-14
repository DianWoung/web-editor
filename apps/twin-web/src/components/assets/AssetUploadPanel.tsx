import type { AssetUpload } from '@/schemas/assets'

type Props = {
  modelUpload: AssetUpload | null
  selectedFileName: string | null
  uploading?: boolean
  onSelectFile: (file: File | null) => void
  onUpload: () => void
}

export function AssetUploadPanel({
  modelUpload,
  selectedFileName,
  uploading = false,
  onSelectFile,
  onUpload,
}: Props) {
  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>模型文件</h2>
          <p className="muted small">第一版走本地对象存储适配层，后续可平移到 OSS。</p>
        </div>
        <button type="button" className="secondary" onClick={onUpload} disabled={uploading}>
          {uploading ? '上传中…' : '上传模型'}
        </button>
      </div>
      <label className="assets-file-picker">
        <span>选择 GLB 文件</span>
        <input
          aria-label="选择模型文件"
          type="file"
          accept=".glb,model/gltf-binary"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {selectedFileName ? <p className="toolbar-hint">待上传：{selectedFileName}</p> : null}
      {modelUpload ? (
        <div className="assets-upload-meta">
          <p>当前模型：{modelUpload.fileName}</p>
          <p className="toolbar-hint">
            访问地址：<span>{modelUpload.publicUrl}</span>
          </p>
        </div>
      ) : (
        <p className="toolbar-hint">尚未上传模型文件。</p>
      )}
    </section>
  )
}
