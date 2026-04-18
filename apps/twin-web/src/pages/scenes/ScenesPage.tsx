import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { SceneLibraryItem } from '@/schemas/scene'
import { createEmptyNamedScene, deleteNamedScene, listNamedScenes } from '@/services/loadDemoScene'

export function ScenesPage() {
  const navigate = useNavigate()
  const [sceneName, setSceneName] = useState('')
  const [sceneRemark, setSceneRemark] = useState('')
  const [items, setItems] = useState<SceneLibraryItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deletingSceneId, setDeletingSceneId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pendingDeleteItem = useMemo(
    () => items.find((item) => item.id === deletingSceneId) ?? null,
    [items, deletingSceneId],
  )

  const refreshList = async () => {
    setLoadingList(true)
    const result = await listNamedScenes()
    setLoadingList(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setItems(result.data.items)
    setError(null)
  }

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) {
        return refreshList()
      }
      return undefined
    })
    return () => {
      cancelled = true
    }
  }, [])

  const createScene = async () => {
    const trimmedName = sceneName.trim()
    const trimmedRemark = sceneRemark.trim()
    if (!trimmedName) {
      setError('请输入场景名称后再创建场景')
      return
    }

    setCreating(true)
    const result = await createEmptyNamedScene(trimmedName, trimmedRemark)
    setCreating(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setSceneName('')
    setSceneRemark('')
    setCreateDialogOpen(false)
    setMessage(`已创建场景：${result.data.name}`)
    setError(null)
    await refreshList()
    navigate(`/editor?sceneId=${encodeURIComponent(result.data.sceneId)}`)
  }

  const confirmDelete = async () => {
    if (!deletingSceneId) {
      return
    }
    const result = await deleteNamedScene(deletingSceneId)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('场景已删除')
    setDeletingSceneId(null)
    await refreshList()
  }

  return (
    <div className="scenes-workbench">
      <section className="scenes-card scenes-card--create scenes-workbench-header">
        <div className="scenes-workbench-header__title">
          <div>
            <h1>场景</h1>
            <p className="muted small">在这里创建、预览、编辑和删除场景。</p>
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setSceneName('')
              setSceneRemark('')
              setCreateDialogOpen(true)
            }}
          >
            新增场景
          </button>
        </div>
      </section>

      <section className="scenes-card scenes-card--list">
        <div className="scenes-list-header">
          <h2>已保存场景</h2>
          {loadingList ? <span className="toolbar-hint">读取中…</span> : null}
        </div>
        {items.length === 0 && !loadingList ? <p className="toolbar-hint">还没有命名场景</p> : null}
        <ul className="scenes-card-list">
          {items.map((item) => (
            <li key={item.id} className="scenes-scene-card">
              <div className="scenes-scene-card__head">
                <div>
                  <h3 className="scenes-scene-card__title">
                    {item.name}
                    {item.isCurrent ? <span className="scene-library-badge">当前</span> : null}
                  </h3>
                  <p className="toolbar-hint">{item.remark || '暂无备注'}</p>
                </div>
                <span className="toolbar-hint">{new Date(item.updatedAt).toLocaleString()}</span>
              </div>
              <div className="scenes-scene-card__meta">
                <span>{item.deviceCount} 台设备</span>
                <span>{item.pipeCount} 条管线</span>
              </div>
              <div className="scenes-list-row__actions">
                <Link className="secondary scene-link-button" to={`/scenes/${encodeURIComponent(item.id)}/overview`}>
                  总览
                </Link>
                <Link className="secondary scene-link-button" to={`/scenes/${encodeURIComponent(item.id)}/preview`}>
                  预览
                </Link>
                <Link className="secondary scene-link-button" to={`/editor?sceneId=${encodeURIComponent(item.id)}`}>
                  编辑
                </Link>
                <button type="button" className="secondary danger-outline" onClick={() => setDeletingSceneId(item.id)}>
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {message ? (
        <section className="scenes-card scenes-card--notice">
          <p>{message}</p>
        </section>
      ) : null}
      {error ? (
        <section className="scenes-card scenes-card--error">
          <p>{error}</p>
        </section>
      ) : null}

      {pendingDeleteItem ? (
        <div className="scene-delete-backdrop" role="presentation">
          <section className="scene-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-delete-title">
            <h2 id="scene-delete-title">确认删除场景</h2>
            <p>场景：{pendingDeleteItem.name}</p>
            <p className="muted small">删除后不可恢复，请确认是否继续。</p>
            <div className="scenes-actions">
              <button type="button" className="secondary" onClick={() => setDeletingSceneId(null)}>
                取消
              </button>
              <button type="button" className="secondary danger-outline" onClick={() => void confirmDelete()}>
                确认删除
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {createDialogOpen ? (
        <div className="scene-delete-backdrop" role="presentation">
          <section className="scene-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="scene-create-title">
            <h2 id="scene-create-title">新增场景</h2>
            <div className="scene-create-dialog__fields">
              <label>
                <span className="scenes-field-label">名称</span>
                <input
                  aria-label="新建场景名称"
                  className="toolbar-input"
                  value={sceneName}
                  onChange={(event) => setSceneName(event.target.value)}
                  placeholder="例如：冷站夜间工况"
                />
              </label>
              <label>
                <span className="scenes-field-label">备注</span>
                <input
                  aria-label="新建场景备注"
                  className="toolbar-input"
                  value={sceneRemark}
                  onChange={(event) => setSceneRemark(event.target.value)}
                  placeholder="一句话说明场景用途"
                />
              </label>
            </div>
            <div className="scenes-actions">
              <button type="button" className="secondary" onClick={() => setCreateDialogOpen(false)}>
                取消
              </button>
              <button type="button" className="primary" onClick={createScene} disabled={creating}>
                {creating ? '创建中…' : '创建并编辑'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
