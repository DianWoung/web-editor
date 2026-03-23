import type { ThreeEvent } from '@react-three/fiber'
import type { PortDef } from '@/schemas/port'
import { systemColor } from '@/constants/systemColors'

type Props = {
  port: PortDef
  selected: boolean
  wireActive: boolean
  onPick: () => void
}

/** 端口在设备局部坐标；父级 group 已含设备位姿，勿再套一层世界坐标（否则会双重变换）。 */
export function PortMarker({ port, selected, wireActive, onPick }: Props) {
  const color = systemColor(port.system)
  const scale = wireActive ? 1.25 : 1

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onPick()
  }

  return (
    <mesh
      position={[port.position[0], port.position[1], port.position[2]]}
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
