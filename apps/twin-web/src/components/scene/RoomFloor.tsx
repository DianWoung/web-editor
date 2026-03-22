import { useMemo } from 'react'
import { Grid } from '@react-three/drei'
import { sceneTheme } from '@/theme/sceneTheme'

export function RoomFloor() {
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

  return (
    <>
      <Grid position={[0, 0, 0]} {...gridConfig} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
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
