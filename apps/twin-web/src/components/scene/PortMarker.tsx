import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Device } from '@/schemas/device'
import type { PortDef } from '@/schemas/port'
import { systemColor } from '@/constants/systemColors'
import { getPortWorldPosition } from '@/utils/portWorld'

type Props = {
  device: Device
  port: PortDef
  selected: boolean
  wireActive: boolean
  onPick: () => void
}

export function PortMarker({ device, port, selected, wireActive, onPick }: Props) {
  const world = useMemo(() => getPortWorldPosition(device, port), [device, port])
  const color = systemColor(port.system)
  const scale = wireActive ? 1.25 : 1

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onPick()
  }

  return (
    <mesh
      position={world}
      scale={scale}
      onPointerDown={handlePointerDown}
      castShadow
      userData={{ ignoreFloorDeselect: true }}
    >
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={selected ? color : '#000000'}
        emissiveIntensity={selected ? 0.65 : 0}
        roughness={0.35}
        metalness={0.15}
      />
    </mesh>
  )
}
