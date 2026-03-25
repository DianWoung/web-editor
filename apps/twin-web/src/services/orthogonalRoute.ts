import { Vector3 } from 'three'
import { TRUNK_Y } from '@/constants/trunk'

function dedupeConsecutive(points: Vector3[]): Vector3[] {
  const out: Vector3[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && last.distanceToSquared(p) < 1e-8) continue
    out.push(p.clone())
  }
  return out
}

/**
 * MVP 正交路径：竖直 → 在 trunk 标高沿 X 再沿 Z → 竖直。
 * 输入/输出均为世界坐标（米）。
 */
export function buildOrthogonalRoute(
  a: Vector3,
  b: Vector3,
  trunkY = TRUNK_Y,
  /** 从路径两端沿相邻线段方向裁剪，避免圆柱端点落在设备内部导致穿模（米） */
  endpointTrim = 0,
): Vector3[] {
  const p0 = a.clone()
  const p1 = new Vector3(a.x, trunkY, a.z)
  const p2 = new Vector3(b.x, trunkY, a.z)
  const p3 = new Vector3(b.x, trunkY, b.z)
  const p4 = b.clone()
  const pts = dedupeConsecutive([p0, p1, p2, p3, p4])

  if (endpointTrim > 0 && pts.length >= 2) {
    // 起点沿第一段方向裁剪
    const d0 = pts[1]!.clone().sub(pts[0]!)
    const len0 = d0.length()
    if (len0 > 1e-6) {
      d0.multiplyScalar(endpointTrim / len0)
      pts[0]!.add(d0)
    }

    // 终点沿最后一段方向裁剪
    const n = pts.length
    const d1 = pts[n - 2]!.clone().sub(pts[n - 1]!)
    const len1 = d1.length()
    if (len1 > 1e-6) {
      d1.multiplyScalar(endpointTrim / len1)
      pts[n - 1]!.add(d1)
    }
  }

  return pts
}
