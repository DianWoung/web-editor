import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { SceneLibraryItem } from '@/schemas/scene'
import { createEmptyNamedScene, deleteNamedScene, listNamedScenes } from '@/services/loadDemoScene'

export function ScenesPage() {
  const navigate = useNavigate()
  const [sceneName, setSceneName] = useState('')
  const [sceneRemark, setSceneRemark] = useState('')
  const [items, setItems] = useState<SceneLibraryItem[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingSceneId, setDeletingSceneId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedSceneId) ?? null,
    [items, selectedSceneId],
  )
  const pendingDeleteItem = useMemo(
    () => items.find((item) => item.id === deletingSceneId) ?? null,
    [items, deletingSceneId],
  )

  const refreshList = async (preferredSceneId?: string | null) => {
    setLoadingList(true)
    const result = await listNamedScenes()
    setLoadingList(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setItems(result.data.items)
    setSelectedSceneId((current) => {
      if (preferredSceneId !== undefined) {
        return preferredSceneId
      }
      if (current && result.data.items.some((item) => item.id === current)) {
        return current
      }
      return result.data.items.find((item) => item.isCurrent)?.id ?? result.data.items[0]?.id ?? null
    })
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
    setMessage(`已创建场景：${result.data.name}`)
    setError(null)
    await refreshList(result.data.sceneId)
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
    await refreshList(null)
  }

  return (
    <div className="scenes-workbench">
      <section className="scenes-card scenes-card--create">
        <div className="scenes-card-header">
          <div>
            <h1>场景工作台</h1>
            <p className="muted small">先完成最小建档，再进入编排；所有场景入口统一从这里进入。</p>
          </div>
        </div>
        <div className="scenes-create-grid">
          <label>
            <span>场景名称</span>
            <input
              aria-label="新建场景名称"
              className="toolbar-input"
              value={sceneName}
              onChange={(event) => setSceneName(event.target.value)}
              placeholder="例如：冷站夜间工况"
            />
          </label>
          <label>
            <span>场景备注</span>
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
          <button type="button" className="primary" onClick={createScene} disabled={creating}>
            {creating ? '创建中…' : '创建并编辑'}
          </button>
          <button type="button" className="secondary" onClick={() => void refreshList(selectedSceneId)}>
            刷新列表
          </button>
        </div>
      </section>

      <section className="scenes-card scenes-card--list">
        <div className="scenes-list-header">
          <h2>已保存场景</h2>
          {loadingList ? <span className="toolbar-hint">读取中…</span> : null}
        </div>
        {items.length === 0 && !loadingList ? <p className="toolbar-hint">还没有命名场景</p> : null}
        <ul className="scenes-list">
          {items.map((item) => (
            <li key={item.id} className="scenes-workbench-row">
              <button
                type="button"
                className={`scenes-list-item${item.id === selectedSceneId ? ' scenes-list-item--active' : ''}`}
                onClick={() => setSelectedSceneId(item.id)}
              >
                <span className="scenes-list-item__title">
                  {item.name}
                  {item.isCurrent ? <span className="scene-library-badge">当前</span> : null}
                </span>
                <span className="toolbar-hint">{item.remark || '暂无备注'}</span>
                <span className="toolbar-hint">
                  {item.deviceCount} 台设备 · {item.pipeCount} 条管线 · {new Date(item.updatedAt).toLocaleString()}
                </span>
              </button>
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

      <section className="scenes-card scenes-card--summary">
        <div className="scenes-card-header">
          <div>
            <h2>{selectedItem?.name ?? '未选择场景'}</h2>
            <p className="muted small">
              {selectedItem ? `最近更新：${new Date(selectedItem.updatedAt).toLocaleString()}` : '从列表中选择一个场景查看摘要。'}
            </p>
          </div>
          {selectedItem ? (
            <div className="scenes-actions">
              <Link className="secondary scene-link-button" to={`/scenes/${encodeURIComponent(selectedItem.id)}/overview`}>
                打开总览
              </Link>
              <Link className="secondary scene-link-button" to={`/editor?sceneId=${encodeURIComponent(selectedItem.id)}`}>
                进入编辑
              </Link>
            </div>
          ) : null}
        </div>
        {selectedItem ? (
          <>
            <p className="scenes-summary-remark">{selectedItem.remark || '暂无备注'}</p>
            <div className="scenes-preview-grid">
              <article className="scenes-preview-stat">
                <span className="toolbar-hint">设备数</span>
                <strong>{selectedItem.deviceCount}</strong>
              </article>
              <article className="scenes-preview-stat">
                <span className="toolbar-hint">管线数</span>
                <strong>{selectedItem.pipeCount}</strong>
              </article>
            </div>
          </>
        ) : null}
      </section>

      <section className="scenes-card scenes-card--status">
        <h2>状态</h2>
        <p className="toolbar-hint">当前选中：{selectedItem?.name ?? '无'}</p>
        <p className="toolbar-hint">工作场景：{items.find((item) => item.isCurrent)?.name ?? '未绑定命名场景'}</p>
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
    </div>
  )
}
