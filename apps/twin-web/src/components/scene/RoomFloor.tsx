import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { sceneTheme } from '@/theme/sceneTheme'

type Props = {
  showGrid?: boolean
  /** 地面点击（编排页「地面放置」模式） */
  onFloorClick?: (point: [number, number, number]) => void
}

export function RoomFloor({ showGrid = true, onFloorClick }: Props) {
  const gridConfig = useMemo(
    () => ({
      cellSize: 1,
      cellThickness: 0.42,
      cellColor: sceneTheme.gridCell,
      sectionSize: 5,
      sectionThickness: 0.8,
      sectionColor: sceneTheme.gridSection,
      fadeDistance: 56,
      fadeStrength: 0.85,
      followCamera: false,
      infiniteGrid: true,
    }),
    [],
  )

  const handlePlaneClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onFloorClick?.([e.point.x, e.point.y, e.point.z])
  }

  return (
    <>
      {showGrid ? <Grid position={[0, 0, 0]} {...gridConfig} /> : null}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.001, 0]}
        onClick={onFloorClick ? handlePlaneClick : undefined}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color={sceneTheme.floorColor}
          roughness={0.8}
          metalness={0.07}
          emissive={sceneTheme.floorEmissive}
          emissiveIntensity={sceneTheme.floorEmissiveIntensity}
        />
      </mesh>
    </>
  )
}
