import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import type { SceneFile, SceneLibraryItem } from '@/schemas/scene'
import { createEmptyNamedScene, fetchNamedScene, listNamedScenes } from '@/services/loadDemoScene'

function emptyPreview(): SceneFile {
  return { version: 1, devices: [], portGroups: [], pipes: [] }
}

export function ScenesPage() {
  const navigate = useNavigate()
  const [sceneName, setSceneName] = useState('')
  const [items, setItems] = useState<SceneLibraryItem[]>([])
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [preview, setPreview] = useState<SceneFile | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedSceneId) ?? null,
    [items, selectedSceneId],
  )
  const previewScene = preview ?? emptyPreview()

  const refreshList = async (preferredSceneId?: string | null) => {
    setLoadingList(true)
    const result = await listNamedScenes()
    setLoadingList(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setItems(result.data.items)
    const nextSelectedId =
      preferredSceneId ??
      result.data.items.find((item) => item.isCurrent)?.id ??
      result.data.items[0]?.id ??
      null
    setSelectedSceneId(nextSelectedId)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshList()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!selectedSceneId) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      setLoadingPreview(true)
      void fetchNamedScene(selectedSceneId).then((result) => {
        if (cancelled) return
        setLoadingPreview(false)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setPreview(result.data)
        setError(null)
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [selectedSceneId])

  const createScene = async () => {
    const trimmedName = sceneName.trim()
    if (!trimmedName) {
      setError('请输入场景名称后再创建场景')
      return
    }
    setCreating(true)
    const result = await createEmptyNamedScene(trimmedName)
    setCreating(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSceneName(trimmedName)
    setError(null)
    await refreshList(result.data.sceneId)
    navigate(`/editor?sceneId=${encodeURIComponent(result.data.sceneId)}`)
  }

  return (
    <div className="scenes-page">
      <aside className="scenes-side">
        <section className="scenes-card">
          <h1>场景管理</h1>
          <p className="muted small">集中维护命名场景，可创建、预览，并进入编排器继续编辑。</p>
          <label className="scenes-create">
            <span>新建场景</span>
            <input
              aria-label="新建场景名称"
              className="toolbar-input"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="例如：冷站夜间工况"
            />
          </label>
          <div className="scenes-actions">
            <button type="button" className="primary" onClick={createScene} disabled={creating}>
              {creating ? '创建中…' : '创建并编辑'}
            </button>
            <button type="button" className="secondary" onClick={() => void refreshList(selectedSceneId)}>
              刷新列表
            </button>
          </div>
        </section>
        <section className="scenes-card">
          <div className="scenes-list-header">
            <h2>已保存场景</h2>
            {loadingList ? <span className="toolbar-hint">读取中…</span> : null}
          </div>
          {items.length === 0 && !loadingList ? <p className="toolbar-hint">还没有命名场景</p> : null}
          <ul className="scenes-list">
            {items.map((item) => (
              <li key={item.id} className="scenes-list-row">
                <button
                  type="button"
                  className={`scenes-list-item${item.id === selectedSceneId ? ' scenes-list-item--active' : ''}`}
                  onClick={() => setSelectedSceneId(item.id)}
                >
                  <span className="scenes-list-item__title">
                    {item.name}
                    {item.isCurrent ? <span className="scene-library-badge">当前</span> : null}
                  </span>
                  <span className="toolbar-hint">
                    {item.deviceCount} 台设备 · {item.pipeCount} 条管线
                  </span>
                </button>
                <div className="scenes-list-row__actions">
                  <Link className="secondary scene-link-button" to={`/scenes/${encodeURIComponent(item.id)}/preview`}>
                    预览
                  </Link>
                  <Link className="secondary scene-link-button" to={`/editor?sceneId=${encodeURIComponent(item.id)}`}>
                    编辑
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </aside>
      <main className="scenes-preview">
        <section className="scenes-card scenes-card--hero">
          <div className="scenes-preview-header">
            <div>
              <h2>{selectedItem?.name ?? '未选择场景'}</h2>
              {selectedItem ? (
                <p className="muted small">最近更新：{new Date(selectedItem.updatedAt).toLocaleString()}</p>
              ) : (
                <p className="muted small">从左侧列表选择一个场景查看预览。</p>
              )}
            </div>
            {selectedItem ? (
              <div className="scenes-actions">
                <Link className="secondary scene-link-button" to={`/editor?sceneId=${encodeURIComponent(selectedItem.id)}`}>
                  进入编辑
                </Link>
              </div>
            ) : null}
          </div>
          {loadingPreview ? <p className="toolbar-hint">正在加载场景预览…</p> : null}
          {!loadingPreview && selectedItem ? (
            <div className="scenes-preview-grid">
              <article className="scenes-preview-stat">
                <span className="toolbar-hint">设备数</span>
                <strong>{previewScene.devices.length}</strong>
              </article>
              <article className="scenes-preview-stat">
                <span className="toolbar-hint">管线数</span>
                <strong>{previewScene.pipes.length}</strong>
              </article>
              <article className="scenes-preview-stat">
                <span className="toolbar-hint">端口组</span>
                <strong>{previewScene.portGroups.length}</strong>
              </article>
            </div>
          ) : null}
        </section>
        <div className="scenes-preview-columns">
          <section className="scenes-card">
            <h2>设备预览</h2>
            {previewScene.devices.length === 0 ? <p className="toolbar-hint">该场景还没有设备。</p> : null}
            <ul className="scenes-detail-list">
              {previewScene.devices.map((device) => (
                <li key={device.id}>
                  <strong>{device.name}</strong>
                  <span className="toolbar-hint">
                    {device.id} · {device.system} · {device.assetId}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="scenes-card">
            <h2>管线预览</h2>
            {previewScene.pipes.length === 0 ? <p className="toolbar-hint">该场景还没有管线。</p> : null}
            <ul className="scenes-detail-list">
              {previewScene.pipes.map((pipe) => (
                <li key={pipe.id}>
                  <strong>{pipe.system}</strong>
                  <span className="toolbar-hint">
                    {pipe.from} → {pipe.to}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        {error ? (
          <section className="scenes-card scenes-card--error">
            <p>{error}</p>
          </section>
        ) : null}
      </main>
    </div>
  )
}
