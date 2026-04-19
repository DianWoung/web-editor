import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { SceneWorkspaceHeader } from '@/components/layout/SceneWorkspaceHeader'
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
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pendingDeleteItem = useMemo(
    () => items.find((item) => item.id === deletingSceneId) ?? null,
    [items, deletingSceneId],
  )
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedSceneId) ?? items.find((item) => item.isCurrent) ?? items[0] ?? null,
    [items, selectedSceneId],
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
    setSelectedSceneId((current) => {
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
    setCreateDialogOpen(false)
    setMessage(`已创建场景：${result.data.name}`)
    setError(null)
    await refreshList()
    setSelectedSceneId(result.data.sceneId)
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

  const runtimeSummary = useMemo(() => {
    if (!selectedItem) {
      return null
    }
    const activeAlarms = selectedItem.isCurrent ? Math.min(2, Math.max(0, selectedItem.deviceCount - 1)) : 0
    return {
      onlineDevices: selectedItem.deviceCount,
      activeAlarms,
      totalPower: selectedItem.deviceCount === 0 ? '—' : `${(selectedItem.deviceCount * 126.4).toFixed(0)} kW`,
      efficiency: selectedItem.deviceCount === 0 ? '—' : (4.18 + selectedItem.pipeCount * 0.21).toFixed(2),
      hint:
        selectedItem.deviceCount === 0
          ? '当前场景还没有设备，实时数据接入后这里会显示在线状态、告警和业务指标。'
          : activeAlarms > 0
            ? '当前场景存在待关注异常，后续可在这里接入真实告警流和设备状态。'
            : '当前场景运行平稳，后续可在这里持续刷新设备状态与 KPI。',
    }
  }, [selectedItem])

  return (
    <div className="scenes-workbench">
      <SceneWorkspaceHeader
        eyebrow="Scene Operations"
        title="场景运营中台"
        description="以场景为一级对象统一管理编排、预览、运行态与配置入口。"
        actions={
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
        }
      />

      <div className="scenes-ops-layout">
        <section className="scenes-card scenes-card--list">
          <div className="scenes-list-header">
            <div>
              <h2>场景列表</h2>
              <p className="toolbar-hint">从这里切换当前场景，并进入总览、预览或编辑。</p>
            </div>
            {loadingList ? <span className="toolbar-hint">读取中…</span> : null}
          </div>
          {items.length === 0 && !loadingList ? <p className="toolbar-hint">还没有命名场景</p> : null}
          <ul className="scenes-card-list">
            {items.map((item) => {
              const isSelected = item.id === selectedItem?.id
              return (
                <li
                  key={item.id}
                  className={`scenes-scene-card${isSelected ? ' scenes-scene-card--active' : ''}`}
                  onClick={() => setSelectedSceneId(item.id)}
                >
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
              )
            })}
          </ul>
        </section>

        <section className="scenes-card scenes-card--runtime">
          <div className="scenes-list-header">
            <div>
              <h2>当前场景实时摘要</h2>
              <p className="toolbar-hint">未来这里会承接场景级实时设备状态、告警和业务指标。</p>
            </div>
          </div>

          {selectedItem ? (
            <>
              <div className="scenes-runtime-header">
                <div>
                  <h3 className="scenes-runtime-header__title">{selectedItem.name}</h3>
                  <p className="toolbar-hint">{selectedItem.remark || '暂无备注'}</p>
                </div>
                <span className="toolbar-hint">{new Date(selectedItem.updatedAt).toLocaleString()}</span>
              </div>

              <div className="scenes-runtime-grid">
                <article className="scenes-runtime-metric">
                  <span className="scenes-runtime-metric__label">在线设备</span>
                  <strong>{runtimeSummary?.onlineDevices ?? 0}</strong>
                </article>
                <article className="scenes-runtime-metric">
                  <span className="scenes-runtime-metric__label">活动告警</span>
                  <strong>{runtimeSummary?.activeAlarms ?? 0}</strong>
                </article>
                <article className="scenes-runtime-metric">
                  <span className="scenes-runtime-metric__label">业务指标</span>
                  <strong>{runtimeSummary?.totalPower ?? '—'}</strong>
                </article>
                <article className="scenes-runtime-metric">
                  <span className="scenes-runtime-metric__label">效率</span>
                  <strong>{runtimeSummary?.efficiency ?? '—'}</strong>
                </article>
              </div>

              <div className="scenes-runtime-stage">
                <div className="scenes-runtime-stage__main">
                  <span className="scenes-runtime-stage__eyebrow">Realtime Stage</span>
                  <p>{runtimeSummary?.hint}</p>
                </div>
                <div className="scenes-runtime-stage__actions">
                  <Link className="secondary scene-link-button" to={`/scenes/${encodeURIComponent(selectedItem.id)}/overview`}>
                    进入总览
                  </Link>
                  <Link className="secondary scene-link-button" to={`/scenes/${encodeURIComponent(selectedItem.id)}/preview`}>
                    进入预览
                  </Link>
                  <Link className="secondary scene-link-button" to={`/editor?sceneId=${encodeURIComponent(selectedItem.id)}`}>
                    进入编辑
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <p className="toolbar-hint">选择一个场景后，这里会显示它的实时摘要。</p>
          )}
        </section>
      </div>

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
