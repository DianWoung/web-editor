import { useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { OrbitControls } from '@react-three/drei'
import { DeviceInstance } from '@/components/scene/DeviceInstance'
import { PipeRun } from '@/components/scene/PipeRun'
import { RoomFloor } from '@/components/scene/RoomFloor'
import { useSceneStore } from '@/store/sceneStore'
import { sceneTheme } from '@/theme/sceneTheme'

type Props = {
  modelGlbByAssetId: Record<string, boolean>
}

export function ViewerCanvas({ modelGlbByAssetId }: Props) {
  const navigate = useNavigate()
  const devices = useSceneStore((s) => s.devices)
  const portGroups = useSceneStore((s) => s.portGroups)
  const pipes = useSceneStore((s) => s.pipes)

  const openDevice = (id: string) => {
    navigate(`/detail/${encodeURIComponent(id)}`)
  }

  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        outputColorSpace: SRGBColorSpace,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{ position: [14, 11, 14], fov: 45, near: 0.1, far: 500 }}
      style={{ width: '100%', height: '100%', background: sceneTheme.background }}
    >
      <color attach="background" args={[sceneTheme.background]} />
      <ambientLight color={sceneTheme.ambientColor} intensity={sceneTheme.ambientIntensity} />
      <hemisphereLight
        args={[sceneTheme.hemisphereSky, sceneTheme.hemisphereGround, sceneTheme.hemisphereIntensity]}
        position={[0, 48, 0]}
      />
      <pointLight position={[-14, 12, -12]} color={sceneTheme.fillColor} intensity={sceneTheme.fillIntensity} />
      <directionalLight
        color={sceneTheme.directionalColor}
        position={[12, 20, 10]}
        intensity={sceneTheme.directionalIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={64}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.00025}
        shadow-normalBias={0.03}
        shadow-radius={9}
      />
      <OrbitControls makeDefault minDistance={4} maxDistance={80} maxPolarAngle={Math.PI * 0.49} />
      <RoomFloor />
      {pipes.map((p) => (
        <PipeRun key={p.id} pipe={p} devices={devices} portGroups={portGroups} />
      ))}
      {devices.map((d) => {
        const pg = portGroups.find((g) => g.deviceId === d.id)
        const ports = pg?.ports ?? []
        return (
          <DeviceInstance
            key={d.id}
            device={d}
            ports={ports}
            modelGlb={modelGlbByAssetId[d.assetId] ?? false}
            mode="viewer"
            onOpenDevice={openDevice}
          />
        )
      })}
    </Canvas>
  )
}
