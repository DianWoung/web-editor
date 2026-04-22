import { Fragment, useLayoutEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { OrbitControls } from '@react-three/drei/core/OrbitControls'
import { Html } from '@react-three/drei'
import { DeviceInstance } from '@/components/scene/DeviceInstance'
import { PipeRun } from '@/components/scene/PipeRun'
import { RoomFloor } from '@/components/scene/RoomFloor'
import { useSceneStore } from '@/store/sceneStore'
import { useRuntimeStore } from '@/store/runtimeStore'
import { sceneTheme } from '@/theme/sceneTheme'
import type { RenderStyle } from '@/services/loadEquipmentCatalog'
import { configureTwinWebRenderer, twinWebShadowMapConfig } from '@/utils/webglCanvasSetup'
import { getSceneViewFrame, type SceneViewFrame } from '@/components/scene/sceneViewFrame'

type Props = {
  modelUrlByAssetId: Record<string, string | null | undefined>
  renderStyleByAssetId: Record<string, RenderStyle | undefined>
  flowEnabled?: boolean
  resetViewNonce?: number
  onOpenDevice?: (id: string) => void
}

type OrbitControlsHandle = {
  target: { set: (x: number, y: number, z: number) => void }
  update: () => void
  saveState?: () => void
  minDistance: number
  maxDistance: number
}

function formatDeviceType(type: string) {
  if (type === 'chiller') return '离心冷机'
  if (type === 'pump') return '泵组设备'
  if (type === 'tower') return '冷却塔'
  if (type === 'heat-exchanger') return '换热模块'
  if (type === 'valve') return '阀门组件'
  if (type === 'sensor') return '传感器'
  return type
}

function DeviceSemanticLabel({
  position,
  title,
  subtitle,
  status,
}: {
  position: [number, number, number]
  title: string
  subtitle: string
  status: 'alarm' | 'active'
}) {
  return (
    <Html position={position} distanceFactor={34} occlude="blending">
      <div className={`client-scene-semantic-label client-scene-semantic-label--${status}`}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </Html>
  )
}

function SystemZoneLabel({
  position,
  name,
  count,
}: {
  position: [number, number, number]
  name: string
  count: number
}) {
  return (
    <Html position={position} distanceFactor={42}>
      <div className="client-scene-zone-label">
        <span>{name}</span>
        <strong>{count} 台设备</strong>
      </div>
    </Html>
  )
}

function ViewerOrbitControls({
  frame,
  resetViewNonce = 0,
}: {
  frame: SceneViewFrame
  resetViewNonce?: number
}) {
  const ref = useRef<OrbitControlsHandle | null>(null)
  const { camera } = useThree()

  useLayoutEffect(() => {
    camera.position.set(...frame.position)
    camera.lookAt(...frame.target)
    camera.updateProjectionMatrix()
    ref.current?.target.set(...frame.target)
    if (ref.current) {
      ref.current.minDistance = frame.minDistance
      ref.current.maxDistance = frame.maxDistance
      ref.current.update()
      ref.current.saveState?.()
    }
  }, [camera, frame, resetViewNonce])

  return (
    <OrbitControls
      ref={ref as never}
      makeDefault
      minDistance={frame.minDistance}
      maxDistance={frame.maxDistance}
      maxPolarAngle={Math.PI * 0.49}
    />
  )
}

export function ViewerCanvas({
  modelUrlByAssetId,
  renderStyleByAssetId,
  flowEnabled = false,
  resetViewNonce = 0,
  onOpenDevice,
}: Props) {
  const navigate = useNavigate()
  const devices = useSceneStore((s) => s.devices)
  const portGroups = useSceneStore((s) => s.portGroups)
  const pipes = useSceneStore((s) => s.pipes)
  const deviceRuntimeById = useRuntimeStore((s) => s.deviceRuntimeById)
  const frame = useMemo(() => getSceneViewFrame({ devices }), [devices])
  const systemZones = useMemo(() => {
    const groups = new Map<
      string,
      {
        totalX: number
        totalY: number
        totalZ: number
        count: number
      }
    >()

    devices.forEach((device) => {
      const current = groups.get(device.system) ?? { totalX: 0, totalY: 0, totalZ: 0, count: 0 }
      current.totalX += device.position[0]
      current.totalY += device.position[1] + device.boundsHalfExtents[1] * 2.6
      current.totalZ += device.position[2]
      current.count += 1
      groups.set(device.system, current)
    })

    return Array.from(groups.entries()).map(([name, value]) => ({
      name,
      count: value.count,
      position: [
        value.totalX / value.count + (value.totalX / value.count < 0 ? 1.2 : -1.2),
        value.totalY / value.count - 1.6,
        value.totalZ / value.count,
      ] as [number, number, number],
    }))
  }, [devices])

  const openDevice = (id: string) => {
    if (onOpenDevice) {
      onOpenDevice(id)
      return
    }
    navigate(`/detail/${encodeURIComponent(id)}`)
  }

  return (
    <Canvas
      shadows={twinWebShadowMapConfig}
      gl={{
        antialias: typeof window !== 'undefined' ? window.devicePixelRatio <= 2 : true,
        powerPreference: 'low-power',
        outputColorSpace: SRGBColorSpace,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{ position: [...frame.position], fov: 34, near: 0.1, far: 500 }}
      style={{ width: '100%', height: '100%', background: sceneTheme.background }}
      onCreated={({ gl }) => configureTwinWebRenderer(gl)}
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
      <ViewerOrbitControls frame={frame} resetViewNonce={resetViewNonce} />
      <RoomFloor showGrid showPlane={false} />
      {pipes.map((p) => (
        <PipeRun key={p.id} pipe={p} devices={devices} portGroups={portGroups} flowEnabled={flowEnabled} />
      ))}
      {systemZones.map((zone) => (
        <SystemZoneLabel key={zone.name} position={zone.position} name={zone.name} count={zone.count} />
      ))}
      {devices.map((d) => {
        const pg = portGroups.find((g) => g.deviceId === d.id)
        const ports = pg?.ports ?? []
        const alarmCount = deviceRuntimeById.get(d.id)?.alarms.length ?? 0
        const labelPosition: [number, number, number] = [
          d.position[0] + (d.position[0] < 0 ? 2.2 : -2.2),
          d.position[1] + d.boundsHalfExtents[1] * 0.9,
          d.position[2],
        ]
        return (
          <Fragment key={d.id}>
            <DeviceInstance
              device={d}
              ports={ports}
              modelUrl={modelUrlByAssetId[d.assetId] ?? null}
              renderStyle={renderStyleByAssetId[d.assetId] ?? 'box'}
              flowEnabled={flowEnabled}
              mode="viewer"
              onOpenDevice={openDevice}
              showLabelOverride={false}
            />
            <DeviceSemanticLabel
              position={labelPosition}
              title={d.name}
              subtitle={alarmCount > 0 ? `告警 ${alarmCount} · ${formatDeviceType(d.type)}` : `运行中 · ${formatDeviceType(d.type)}`}
              status={alarmCount > 0 ? 'alarm' : 'active'}
            />
          </Fragment>
        )
      })}
    </Canvas>
  )
}
