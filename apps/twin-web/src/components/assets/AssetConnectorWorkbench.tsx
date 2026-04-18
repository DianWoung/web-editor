import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'

import type { AssetConnector } from '@/schemas/assets'
import type { RenderStyle } from '@/services/loadEquipmentCatalog'

import { AssetModelReferencePreview } from './AssetModelReferencePreview'
import {
  completeAndAdvance,
  createPlacementState,
  pointToAnchor,
  projectAnchorToViewport,
  type ConnectorPlacementStatus,
  type PlacementState,
  type ProjectionView,
} from './assetConnectorWorkbenchState'

type WorkflowMode = 'existing' | 'template'

type Props = {
  connectors: AssetConnector[]
  boundsHalfExtents: [number, number, number]
  disabled?: boolean
  modelUrl: string | null
  renderStyle: RenderStyle
  workflowMode: WorkflowMode
  onChange: (connectors: AssetConnector[]) => void
  onSave: () => void
}

const statusLabel: Record<ConnectorPlacementStatus, string> = {
  idle: '未开始',
  placed: '已粗定位',
  done: '已完成',
}

type ViewportPoint = { x: number; y: number }

function nextPlacementState(connectorKeys: string[], workflowMode: WorkflowMode): PlacementState {
  const presetStatus = workflowMode === 'existing' ? 'done' : 'idle'
  return createPlacementState(connectorKeys, presetStatus)
}

function pointFromClientRect(clientX: number, clientY: number, rect: DOMRect | ReturnType<Element['getBoundingClientRect']>): ViewportPoint {
  const width = rect.width || 1
  const height = rect.height || 1
  return {
    x: (clientX - rect.left) / width,
    y: (clientY - rect.top) / height,
  }
}

function updateConnectorAnchor(
  connectors: AssetConnector[],
  connectorKey: string,
  anchor: [number, number, number],
) {
  return connectors.map((connector) =>
    connector.connectorKey === connectorKey
      ? {
          ...connector,
          geometry: {
            ...connector.geometry,
            anchor,
          },
        }
      : connector,
  )
}

type ProjectionViewportProps = {
  active: boolean
  allowMarkerDrag?: boolean
  anchor: [number, number, number]
  ariaLabel: string
  boundsHalfExtents: [number, number, number]
  disabled?: boolean
  label: string
  status: ConnectorPlacementStatus
  view: ProjectionView
  onPlace: (point: ViewportPoint) => void
}

function ProjectionViewport({
  active,
  allowMarkerDrag = false,
  anchor,
  ariaLabel,
  boundsHalfExtents,
  disabled = false,
  label,
  status,
  view,
  onPlace,
}: ProjectionViewportProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const marker = projectAnchorToViewport(view, anchor, boundsHalfExtents)
  const showMarker = status !== 'idle'

  useEffect(() => {
    if (!dragging || !allowMarkerDrag) return

    const handleMove = (event: MouseEvent) => {
      const rect = surfaceRef.current?.getBoundingClientRect()
      if (!rect) return
      onPlace(pointFromClientRect(event.clientX, event.clientY, rect))
    }

    const handleUp = () => {
      setDragging(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [allowMarkerDrag, dragging, onPlace])

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disabled) return
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect) return
    onPlace(pointFromClientRect(event.clientX, event.clientY, rect))
  }

  return (
    <div className={`assets-projection-view ${active ? 'assets-projection-view--active' : ''}`}>
      <div className="assets-projection-view__header">
        <strong>{label}</strong>
        <span className="assets-chip">{statusLabel[status]}</span>
      </div>
      <div
        ref={surfaceRef}
        aria-label={ariaLabel}
        className={`assets-projection-view__surface assets-projection-view__surface--${view}`}
        onClick={handleClick}
      >
        <div className="assets-projection-view__crosshair assets-projection-view__crosshair--horizontal" />
        <div className="assets-projection-view__crosshair assets-projection-view__crosshair--vertical" />
        <div className="assets-projection-view__silhouette" />
        {showMarker ? (
          <button
            type="button"
            className="assets-projection-view__marker"
            style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => {
              if (!allowMarkerDrag || disabled) return
              event.preventDefault()
              event.stopPropagation()
              setDragging(true)
            }}
          >
            <span />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function AssetConnectorWorkbench({
  connectors,
  boundsHalfExtents,
  disabled = false,
  modelUrl,
  renderStyle,
  workflowMode,
  onChange,
  onSave,
}: Props) {
  const connectorKeys = connectors.map((connector) => connector.connectorKey)
  const connectorKeySignature = connectorKeys.join('|')
  const [placement, setPlacement] = useState<PlacementState>(() => nextPlacementState(connectorKeys, workflowMode))

  useEffect(() => {
    setPlacement(nextPlacementState(connectorKeys, workflowMode))
  }, [connectorKeySignature, workflowMode])

  const activeConnector =
    connectors.find((connector) => connector.connectorKey === placement.activeConnectorKey) ?? connectors[0] ?? null
  const activeConnectorKey = activeConnector?.connectorKey ?? null

  useEffect(() => {
    if (activeConnectorKey || connectors.length === 0) return
    setPlacement((current) => ({
      ...current,
      activeConnectorKey: connectors[0]?.connectorKey ?? null,
    }))
  }, [activeConnectorKey, connectors])

  const handlePlace = (view: ProjectionView, point: ViewportPoint) => {
    if (!activeConnector) return
    const anchor = pointToAnchor(view, point, boundsHalfExtents, activeConnector.geometry.anchor)
    onChange(updateConnectorAnchor(connectors, activeConnector.connectorKey, anchor))
    setPlacement((current) => ({
      ...current,
      statusByConnector: {
        ...current.statusByConnector,
        [activeConnector.connectorKey]: 'placed',
      },
    }))
  }

  const handleComplete = () => {
    if (!activeConnectorKey) return
    setPlacement((current) => completeAndAdvance(current, activeConnectorKey))
  }

  return (
    <section className="assets-panel">
      <div className="assets-panel-header">
        <div>
          <h2>端点定位工作台</h2>
          <p className="muted small">先选端点，再在主视图单击粗定位，随后用右视图和顶视图微调，3D 仅做参考核对。</p>
        </div>
        <button type="button" className="secondary" onClick={onSave} disabled={disabled || connectors.length === 0}>
          保存连接点
        </button>
      </div>

      {connectors.length === 0 ? (
        <p className="muted small">先应用一个连接拓扑模板，再逐个完成端点定位。</p>
      ) : (
        <div className="assets-workbench">
          <div className="assets-workbench__sidebar">
            <div className="assets-workbench__current">
              <strong>{activeConnector ? `当前端点：${activeConnector.name}` : '当前端点：未选择'}</strong>
              <span className="muted small">模板语义保持只读，只允许修改名称和必需。</span>
            </div>
            <div className="assets-workbench__list">
              {connectors.map((connector) => {
                const status = placement.statusByConnector[connector.connectorKey] ?? 'idle'
                const isActive = connector.connectorKey === activeConnectorKey
                return (
                  <button
                    key={connector.connectorKey}
                    type="button"
                    className={`assets-workbench__list-item ${isActive ? 'assets-workbench__list-item--active' : ''}`}
                    disabled={disabled}
                    onClick={() =>
                      setPlacement((current) => ({
                        ...current,
                        activeConnectorKey: connector.connectorKey,
                      }))
                    }
                  >
                    <div>
                      <strong>{connector.name}</strong>
                      <div className="meta">
                        {connector.system} / {connector.role} / {connector.direction}
                      </div>
                    </div>
                    <span className="assets-chip">{statusLabel[status]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="assets-workbench__main">
            <ProjectionViewport
              active
              anchor={activeConnector?.geometry.anchor ?? [0, 0, 0]}
              ariaLabel="前视图定位画布"
              boundsHalfExtents={boundsHalfExtents}
              disabled={disabled || !activeConnector}
              label="前视图"
              status={activeConnectorKey ? placement.statusByConnector[activeConnectorKey] ?? 'idle' : 'idle'}
              view="front"
              onPlace={(point) => handlePlace('front', point)}
            />

            <div className="assets-workbench__subviews">
              <ProjectionViewport
                active={false}
                allowMarkerDrag
                anchor={activeConnector?.geometry.anchor ?? [0, 0, 0]}
                ariaLabel="右视图微调画布"
                boundsHalfExtents={boundsHalfExtents}
                disabled={disabled || !activeConnector}
                label="右视图"
                status={activeConnectorKey ? placement.statusByConnector[activeConnectorKey] ?? 'idle' : 'idle'}
                view="right"
                onPlace={(point) => handlePlace('right', point)}
              />
              <ProjectionViewport
                active={false}
                allowMarkerDrag
                anchor={activeConnector?.geometry.anchor ?? [0, 0, 0]}
                ariaLabel="顶视图微调画布"
                boundsHalfExtents={boundsHalfExtents}
                disabled={disabled || !activeConnector}
                label="顶视图"
                status={activeConnectorKey ? placement.statusByConnector[activeConnectorKey] ?? 'idle' : 'idle'}
                view="top"
                onPlace={(point) => handlePlace('top', point)}
              />
            </div>

            <div className="assets-workbench__detail">
              <label>
                <span>当前端点名称</span>
                <input
                  aria-label="当前端点名称"
                  value={activeConnector?.name ?? ''}
                  disabled={disabled || !activeConnector}
                  onChange={(event) =>
                    onChange(
                      connectors.map((connector) =>
                        connector.connectorKey === activeConnectorKey
                          ? { ...connector, name: event.target.value }
                          : connector,
                      ),
                    )
                  }
                />
              </label>
              <label className="assets-checkbox assets-checkbox--inline">
                <input
                  type="checkbox"
                  aria-label="当前端点必需"
                  checked={activeConnector?.required ?? false}
                  disabled={disabled || !activeConnector}
                  onChange={(event) =>
                    onChange(
                      connectors.map((connector) =>
                        connector.connectorKey === activeConnectorKey
                          ? { ...connector, required: event.target.checked }
                          : connector,
                      ),
                    )
                  }
                />
                <span>当前端点必需</span>
              </label>
              <div className="assets-workbench__meta">
                <span className="assets-chip">{activeConnector?.system ?? '未设置'}</span>
                <span className="assets-chip">{activeConnector?.role ?? '未设置'}</span>
                <span className="assets-chip">{activeConnector?.medium ?? '未设置'}</span>
                <span className="assets-chip">{activeConnector?.direction ?? '未设置'}</span>
              </div>
              <button
                type="button"
                className="primary"
                onClick={handleComplete}
                disabled={
                  disabled ||
                  !activeConnectorKey ||
                  (placement.statusByConnector[activeConnectorKey] ?? 'idle') === 'idle'
                }
              >
                完成当前端点
              </button>
            </div>
          </div>

          <div className="assets-workbench__preview">
            <div className="assets-workbench__preview-header">
              <strong>3D 参考</strong>
              <span className="muted small">只读旋转查看，不参与编辑。</span>
            </div>
            <AssetModelReferencePreview
              boundsHalfExtents={boundsHalfExtents}
              modelUrl={modelUrl}
              renderStyle={renderStyle}
            />
          </div>
        </div>
      )}
    </section>
  )
}
