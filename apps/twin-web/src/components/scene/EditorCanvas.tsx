import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { DeviceInstance } from '@/components/scene/DeviceInstance'
import { PipeRun } from '@/components/scene/PipeRun'
import { RoomFloor } from '@/components/scene/RoomFloor'
import { useSceneStore } from '@/store/sceneStore'
import { sceneTheme } from '@/theme/sceneTheme'

type Props = {
  modelGlbByAssetId: Record<string, boolean>
  /** 地面放置：有值时点击地面在该处创建设备 */
  floorPlacementActive?: boolean
  onFloorPlace?: (point: [number, number, number]) => void
}

export function EditorCanvas({
  modelGlbByAssetId,
  floorPlacementActive,
  onFloorPlace,
}: Props) {
  const devices = useSceneStore((s) => s.devices)
  const portGroups = useSceneStore((s) => s.portGroups)
  const pipes = useSceneStore((s) => s.pipes)
  const selection = useSceneStore((s) => s.selection)
  const showGrid = useSceneStore((s) => s.editorUi.showGrid)
  const showPipes = useSceneStore((s) => s.editorUi.showPipes)
  const setSelection = useSceneStore((s) => s.setSelection)

  const selectedPipeId = selection?.kind === 'pipe' ? selection.pipeId : null

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
      onPointerMissed={(e) => {
        if (e.button === 0) setSelection(null)
      }}
      style={{
        width: '100%',
        height: '100%',
        background: sceneTheme.background,
        cursor: floorPlacementActive ? 'crosshair' : undefined,
      }}
    >
      <color attach="background" args={[sceneTheme.background]} />
      <ambientLight color={sceneTheme.ambientColor} intensity={sceneTheme.ambientIntensity} />
      <hemisphereLight
        args={[sceneTheme.hemisphereSky, sceneTheme.hemisphereGround, sceneTheme.hemisphereIntensity]}
        position={[0, 48, 0]}
      />
      <pointLight
        position={[-14, 12, -12]}
        color={sceneTheme.fillColor}
        intensity={sceneTheme.fillIntensity}
      />
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
      <RoomFloor showGrid={showGrid} onFloorClick={floorPlacementActive ? onFloorPlace : undefined} />
      {devices.map((d) => {
        const pg = portGroups.find((g) => g.deviceId === d.id)
        const ports = pg?.ports ?? []
        return (
          <DeviceInstance
            key={d.id}
            device={d}
            ports={ports}
            modelGlb={modelGlbByAssetId[d.assetId] ?? false}
          />
        )
      })}
      {showPipes
        ? pipes.map((p) => (
            <PipeRun
              key={p.id}
              pipe={p}
              devices={devices}
              portGroups={portGroups}
              editorInteractive
              selected={p.id === selectedPipeId}
              onSelectPipe={(id) => setSelection({ kind: 'pipe', pipeId: id })}
            />
          ))
        : null}
    </Canvas>
  )
}
