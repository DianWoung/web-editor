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
export function buildOrthogonalRoute(a: Vector3, b: Vector3, trunkY = TRUNK_Y): Vector3[] {
  const p0 = a.clone()
  const p1 = new Vector3(a.x, trunkY, a.z)
  const p2 = new Vector3(b.x, trunkY, a.z)
  const p3 = new Vector3(b.x, trunkY, b.z)
  const p4 = b.clone()
  return dedupeConsecutive([p0, p1, p2, p3, p4])
}
