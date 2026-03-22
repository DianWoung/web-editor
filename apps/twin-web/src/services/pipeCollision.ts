import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Device } from '@/schemas/device'

const _v = new Vector3()
const _box = new Box3()
const _mat = new Matrix4()
const _quat = new Quaternion()
const _euler = new Euler(0, 0, 0, 'XYZ')

function degToRad(d: number) {
  return (d * Math.PI) / 180
}

/** 旋转设备局部半长盒在世界中的轴对齐包围盒 */
export function deviceWorldAABB(device: Device): Box3 {
  const [hx, hy, hz] = device.boundsHalfExtents
  const corners: [number, number, number][] = [
    [-hx, -hy, -hz],
    [hx, -hy, -hz],
    [-hx, hy, -hz],
    [hx, hy, -hz],
    [-hx, -hy, hz],
    [hx, -hy, hz],
    [-hx, hy, hz],
    [hx, hy, hz],
  ]

  _euler.set(
    degToRad(device.rotation[0]),
    degToRad(device.rotation[1]),
    degToRad(device.rotation[2]),
    'XYZ',
  )
  _quat.setFromEuler(_euler)
  _mat.compose(
    _v.set(device.position[0], device.position[1], device.position[2]),
    _quat,
    _v.set(1, 1, 1),
  )

  _box.makeEmpty()
  for (const [lx, ly, lz] of corners) {
    _v.set(lx, ly, lz).applyMatrix4(_mat)
    _box.expandByPoint(_v)
  }
  return _box.clone()
}

function segmentAabbIntersect(a: Vector3, b: Vector3, box: Box3): boolean {
  // Slab method
  const dir = _v.copy(b).sub(a)
  const invX = dir.x !== 0 ? 1 / dir.x : Number.POSITIVE_INFINITY
  const invY = dir.y !== 0 ? 1 / dir.y : Number.POSITIVE_INFINITY
  const invZ = dir.z !== 0 ? 1 / dir.z : Number.POSITIVE_INFINITY

  let tmin = 0
  let tmax = 1

  const min = box.min
  const max = box.max

  const tx1 = (min.x - a.x) * invX
  const tx2 = (max.x - a.x) * invX
  tmin = Math.max(tmin, Math.min(tx1, tx2))
  tmax = Math.min(tmax, Math.max(tx1, tx2))

  const ty1 = (min.y - a.y) * invY
  const ty2 = (max.y - a.y) * invY
  tmin = Math.max(tmin, Math.min(ty1, ty2))
  tmax = Math.min(tmax, Math.max(ty1, ty2))

  const tz1 = (min.z - a.z) * invZ
  const tz2 = (max.z - a.z) * invZ
  tmin = Math.max(tmin, Math.min(tz1, tz2))
  tmax = Math.min(tmax, Math.max(tz1, tz2))

  return tmax >= tmin
}

export function pipeSegmentsCollideDevices(
  points: Vector3[],
  devices: Device[],
  excludeDeviceIds: Set<string>,
): boolean {
  if (points.length < 2) return false
  const boxes = devices
    .filter((d) => !excludeDeviceIds.has(d.id))
    .map((d) => deviceWorldAABB(d))

  for (let i = 0; i < points.length - 1; i++) {
    const pa = points[i]!
    const pb = points[i + 1]!
    for (const box of boxes) {
      if (segmentAabbIntersect(pa, pb, box)) return true
    }
  }
  return false
}

export function parsePipeEndpoint(ref: string): { deviceId: string; portId: string } | null {
  const i = ref.lastIndexOf('.')
  if (i <= 0 || i === ref.length - 1) return null
  return { deviceId: ref.slice(0, i), portId: ref.slice(i + 1) }
}
