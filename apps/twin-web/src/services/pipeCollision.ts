import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Device } from '@/schemas/device'

const _v = new Vector3()
const _box = new Box3()
const _mat = new Matrix4()
const _quat = new Quaternion()
const _euler = new Euler(0, 0, 0, 'XYZ')

// Pipe geometry matches apps/twin-web/src/components/scene/PipeRun.tsx
const PIPE_CYLINDER_RADIUS = 0.06
const PIPE_ELBOW_SPHERE_RADIUS = 0.09
// 设备的 mesh 往往会略超出 boundsHalfExtents 的理想盒子（尤其不同资产的 pivot/外扩）。
// 给设备包围盒加一点“外形裕量”，避免移动后出现管线仍穿入但检测漏判。
const DEVICE_CLEARANCE = 0.03

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

function segmentAabbIntersectT(
  a: Vector3,
  b: Vector3,
  box: Box3,
): { tmin: number; tmax: number } | null {
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

  if (tmax < tmin) return null
  return { tmin, tmax }
}

export function pipeSegmentsCollideDevices(
  points: Vector3[],
  devices: Device[],
  excludeDeviceIds: Set<string>,
  inflateBy = 0,
  /** 忽略线段两端附近（港口接入处）的碰撞，避免“刚连上端口就被判冲突”。 */
  ignoreEndpointDistance = 0,
): boolean {
  if (points.length < 2) return false

  const boxesSegment = devices
    .filter((d) => !excludeDeviceIds.has(d.id))
    .map((d) => {
      const b = deviceWorldAABB(d)
      b.expandByScalar(Math.max(0, PIPE_CYLINDER_RADIUS + inflateBy + DEVICE_CLEARANCE))
      return b
    })

  const boxesElbow = devices
    .filter((d) => !excludeDeviceIds.has(d.id))
    .map((d) => {
      const b = deviceWorldAABB(d)
      b.expandByScalar(Math.max(0, PIPE_ELBOW_SPHERE_RADIUS + inflateBy + DEVICE_CLEARANCE))
      return b
    })

  // 先检查拐点球体（PipeRun elbow 用 sphereGeometry radius=0.09）
  for (let j = 1; j < points.length - 1; j++) {
    const p = points[j]!
    for (const box of boxesElbow) {
      if (box.containsPoint(p)) return true
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    const pa = points[i]!
    const pb = points[i + 1]!
    const dir = _v.copy(pb).sub(pa)
    const segLen = dir.length()

    // 注意：ignoreEndpointDistance/segLen 在“短线段”上会放大比例。
    // 这里将 ignore 的最大比例收得更小，避免漏报（从而仍出现穿模）。
    const ignoreT = segLen > 1e-6 && ignoreEndpointDistance > 0 ? Math.min(0.2, ignoreEndpointDistance / segLen) : 0

    for (const box of boxesSegment) {
      const hit = segmentAabbIntersectT(pa, pb, box)
      if (!hit) continue

      if (ignoreT > 0) {
        // 仅发生在起点附近 或 仅发生在终点附近时忽略
        const nearStart = hit.tmax <= ignoreT
        const nearEnd = hit.tmin >= 1 - ignoreT
        if (nearStart || nearEnd) continue
      }

      return true
    }
  }
  return false
}

export function parsePipeEndpoint(ref: string): { deviceId: string; portId: string } | null {
  const i = ref.lastIndexOf('.')
  if (i <= 0 || i === ref.length - 1) return null
  return { deviceId: ref.slice(0, i), portId: ref.slice(i + 1) }
}
