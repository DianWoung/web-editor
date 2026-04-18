export type ProjectionView = 'front' | 'right' | 'top'
export type ConnectorPlacementStatus = 'idle' | 'placed' | 'done'

export type PlacementState = {
  activeConnectorKey: string | null
  statusByConnector: Record<string, ConnectorPlacementStatus>
}

type ViewportPoint = {
  x: number
  y: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function extent(value: number) {
  return value > 0 ? value : 1
}

function toSigned(point: ViewportPoint) {
  return {
    x: clamp(point.x, 0, 1) * 2 - 1,
    y: 1 - clamp(point.y, 0, 1) * 2,
  }
}

export function createPlacementState(connectorKeys: string[], presetStatus: ConnectorPlacementStatus = 'idle'): PlacementState {
  return {
    activeConnectorKey: connectorKeys[0] ?? null,
    statusByConnector: Object.fromEntries(connectorKeys.map((key) => [key, presetStatus])),
  }
}

export function pointToAnchor(
  view: ProjectionView,
  point: ViewportPoint,
  boundsHalfExtents: [number, number, number],
  currentAnchor: [number, number, number],
): [number, number, number] {
  const [hx, hy, hz] = boundsHalfExtents.map(extent) as [number, number, number]
  const normalized = toSigned(point)

  if (view === 'front') {
    return [normalized.x * hx, normalized.y * hy, currentAnchor[2]]
  }

  if (view === 'right') {
    return [currentAnchor[0], normalized.y * hy, normalized.x * hz]
  }

  return [normalized.x * hx, currentAnchor[1], normalized.y * hz]
}

export function projectAnchorToViewport(
  view: ProjectionView,
  anchor: [number, number, number],
  boundsHalfExtents: [number, number, number],
): ViewportPoint {
  const [hx, hy, hz] = boundsHalfExtents.map(extent) as [number, number, number]

  if (view === 'front') {
    return {
      x: clamp((anchor[0] / hx + 1) / 2, 0, 1),
      y: clamp((1 - anchor[1] / hy) / 2, 0, 1),
    }
  }

  if (view === 'right') {
    return {
      x: clamp((anchor[2] / hz + 1) / 2, 0, 1),
      y: clamp((1 - anchor[1] / hy) / 2, 0, 1),
    }
  }

  return {
    x: clamp((anchor[0] / hx + 1) / 2, 0, 1),
    y: clamp((1 - anchor[2] / hz) / 2, 0, 1),
  }
}

export function findNextPendingConnector(
  connectorKeys: string[],
  statusByConnector: Record<string, ConnectorPlacementStatus>,
  currentConnectorKey: string,
) {
  const currentIndex = connectorKeys.indexOf(currentConnectorKey)
  if (currentIndex < 0) return connectorKeys.find((key) => statusByConnector[key] !== 'done') ?? null

  for (let index = currentIndex + 1; index < connectorKeys.length; index += 1) {
    if (statusByConnector[connectorKeys[index]] !== 'done') {
      return connectorKeys[index]
    }
  }

  return connectorKeys.find((key) => statusByConnector[key] !== 'done') ?? null
}

export function completeAndAdvance(placement: PlacementState, connectorKey: string): PlacementState {
  const connectorKeys = Object.keys(placement.statusByConnector)
  const statusByConnector = {
    ...placement.statusByConnector,
    [connectorKey]: 'done' as const,
  }

  return {
    statusByConnector,
    activeConnectorKey: findNextPendingConnector(connectorKeys, statusByConnector, connectorKey),
  }
}
