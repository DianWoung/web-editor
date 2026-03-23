export function snapScalar(value: number, grid: number): number {
  if (grid <= 0 || !Number.isFinite(value)) return value
  return Math.round(value / grid) * grid
}

export function snapVec3(
  v: [number, number, number],
  grid: number,
): [number, number, number] {
  if (grid <= 0) return v
  return [snapScalar(v[0], grid), snapScalar(v[1], grid), snapScalar(v[2], grid)]
}
