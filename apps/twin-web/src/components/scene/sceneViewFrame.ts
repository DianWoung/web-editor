import type { Device } from '@/schemas/device'
import type { SceneFile } from '@/schemas/scene'

export type SceneViewFrame = {
  target: [number, number, number]
  position: [number, number, number]
  distance: number
  minDistance: number
  maxDistance: number
}

const DEFAULT_FRAME: SceneViewFrame = {
  target: [0, 1.6, 0],
  position: [12, 8, 12],
  distance: 14,
  minDistance: 4,
  maxDistance: 52,
}

function getDeviceBounds(device: Device) {
  const [x, y, z] = device.position
  const [hx, hy, hz] = device.boundsHalfExtents
  return {
    minX: x - hx,
    maxX: x + hx,
    minY: y - hy,
    maxY: y + hy,
    minZ: z - hz,
    maxZ: z + hz,
  }
}

export function getSceneViewFrame(scene: Pick<SceneFile, 'devices'>): SceneViewFrame {
  if (scene.devices.length === 0) return DEFAULT_FRAME

  const [firstDevice, ...restDevices] = scene.devices
  const initialBounds = getDeviceBounds(firstDevice)
  const bounds = restDevices.reduce((acc, device) => {
    const next = getDeviceBounds(device)
    return {
      minX: Math.min(acc.minX, next.minX),
      maxX: Math.max(acc.maxX, next.maxX),
      minY: Math.min(acc.minY, next.minY),
      maxY: Math.max(acc.maxY, next.maxY),
      minZ: Math.min(acc.minZ, next.minZ),
      maxZ: Math.max(acc.maxZ, next.maxZ),
    }
  }, initialBounds)

  const spanX = bounds.maxX - bounds.minX
  const spanY = bounds.maxY - bounds.minY
  const spanZ = bounds.maxZ - bounds.minZ
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2

  const horizontalSpan = Math.max(spanX, spanZ, 6)
  const verticalSpan = Math.max(spanY, 3)
  const distance = Math.max(horizontalSpan * 0.92, verticalSpan * 2.4, 10)
  const targetY = bounds.minY + verticalSpan * 0.22

  return {
    target: [centerX, targetY, centerZ],
    position: [
      centerX + distance * 0.72,
      targetY + Math.max(distance * 0.88, verticalSpan * 1.6),
      centerZ + distance * 0.72,
    ],
    distance,
    minDistance: Math.max(4, distance * 0.45),
    maxDistance: Math.max(52, distance * 3.1),
  }
}
