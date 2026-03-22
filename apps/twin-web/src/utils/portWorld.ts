import { Matrix4, Quaternion, Vector3 } from 'three'
import type { Device } from '@/schemas/device'
import type { PortDef } from '@/schemas/port'
import { eulerDegToThreeEuler } from '@/utils/degrees'

const _mat = new Matrix4()
const _quat = new Quaternion()
const _pos = new Vector3()
const _scale = new Vector3()

export function getPortWorldPosition(device: Device, port: PortDef, target = new Vector3()) {
  const e = eulerDegToThreeEuler(device.rotation[0], device.rotation[1], device.rotation[2])
  _quat.setFromEuler(e)
  _mat.compose(
    _pos.set(device.position[0], device.position[1], device.position[2]),
    _quat,
    _scale.set(1, 1, 1),
  )
  return target.set(port.position[0], port.position[1], port.position[2]).applyMatrix4(_mat)
}
