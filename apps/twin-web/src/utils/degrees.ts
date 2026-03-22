import { Euler } from 'three'

export function degToRad(d: number) {
  return (d * Math.PI) / 180
}

export function radToDeg(r: number) {
  return (r * 180) / Math.PI
}

export function eulerDegToThreeEuler(rx: number, ry: number, rz: number) {
  return new Euler(degToRad(rx), degToRad(ry), degToRad(rz), 'XYZ')
}

export function eulerThreeToDegTuple(e: Euler): [number, number, number] {
  return [radToDeg(e.x), radToDeg(e.y), radToDeg(e.z)]
}
