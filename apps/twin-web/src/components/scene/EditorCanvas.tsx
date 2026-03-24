import { useEffect, useRef } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { DeviceInstance } from '@/components/scene/DeviceInstance'
import { PipeRun } from '@/components/scene/PipeRun'
import { RoomFloor } from '@/components/scene/RoomFloor'
import { useSceneStore } from '@/store/sceneStore'
import { sceneTheme } from '@/theme/sceneTheme'
import type { RenderStyle } from '@/services/loadEquipmentCatalog'
import { configureTwinWebRenderer } from '@/utils/webglCanvasSetup'

function EditorOrbitControls() {
  /** drei 使用 three-stdlib 的 OrbitControls，与 @types/three 示例路径类型不兼容，仅依赖 reset() */
  const ref = useRef<{ reset: () => void } | null>(null)
  const nonce = useSceneStore((s) => s.editorUi.cameraResetNonce)
  useEffect(() => {
    if (nonce === 0) return
    ref.current?.reset()
  }, [nonce])
  return (
    <OrbitControls
      // drei 绑定 three-stdlib 控制器，与 @types/three 的 OrbitControls 声明不一致
      ref={ref as never}
      makeDefault
      minDistance={4}
      maxDistance={80}
      maxPolarAngle={Math.PI * 0.49}
    />
  )
}

type Props = {
  modelUrlByAssetId: Record<string, string | null | undefined>
  renderStyleByAssetId: Record<string, RenderStyle | undefined>
  /** 地面放置：有值时点击地面在该处创建设备 */
  floorPlacementActive?: boolean
  onFloorPlace?: (point: [number, number, number]) => void
}

export function EditorCanvas({
  modelUrlByAssetId,
  renderStyleByAssetId,
  floorPlacementActive,
  onFloorPlace,
}: Props) {
  const devices = useSceneStore((s) => s.devices)
  const portGroups = useSceneStore((s) => s.portGroups)
  const pipes = useSceneStore((s) => s.pipes)
  const selection = useSceneStore((s) => s.selection)
  const showGrid = useSceneStore((s) => s.editorUi.showGrid)
  const showPipes = useSceneStore((s) => s.editorUi.showPipes)
  const flowEnabled = useSceneStore((s) => s.editorUi.flowEnabled)
  const wireFrom = useSceneStore((s) => s.editorUi.wireFrom)
  const setSelection = useSceneStore((s) => s.setSelection)

  const selectedPipeId = selection?.kind === 'pipe' ? selection.pipeId : null

  return (
    <Canvas
      shadows
      gl={{
        antialias: typeof window !== 'undefined' ? window.devicePixelRatio <= 2 : true,
        powerPreference: 'low-power',
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
        cursor: floorPlacementActive || wireFrom ? 'crosshair' : undefined,
      }}
      onCreated={({ gl }) => configureTwinWebRenderer(gl)}
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
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={64}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.00025}
        shadow-normalBias={0.03}
        shadow-radius={6}
      />
      <EditorOrbitControls />
      <RoomFloor showGrid={showGrid} onFloorClick={floorPlacementActive ? onFloorPlace : undefined} />
      {devices.map((d) => {
        const pg = portGroups.find((g) => g.deviceId === d.id)
        const ports = pg?.ports ?? []
        return (
          <DeviceInstance
            key={d.id}
            device={d}
            ports={ports}
            modelUrl={modelUrlByAssetId[d.assetId] ?? null}
            renderStyle={renderStyleByAssetId[d.assetId] ?? 'box'}
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
              flowEnabled={flowEnabled}
              onSelectPipe={(id) => setSelection({ kind: 'pipe', pipeId: id })}
            />
          ))
        : null}
    </Canvas>
  )
}
