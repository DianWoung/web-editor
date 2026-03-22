import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TransformControls } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Group } from 'three'
import type { Device } from '@/schemas/device'
import type { PortDef } from '@/schemas/port'
import { useSceneStore } from '@/store/sceneStore'
import { eulerDegToThreeEuler, eulerThreeToDegTuple } from '@/utils/degrees'
import { PortMarker } from '@/components/scene/PortMarker'
import { sceneTheme } from '@/theme/sceneTheme'

type Props = {
  device: Device
  ports: PortDef[]
  modelGlb: boolean
  /** editor：编排交互；viewer：总览只读，点击进详情 */
  mode?: 'editor' | 'viewer'
  onOpenDevice?: (deviceId: string) => void
}

export function DeviceInstance({ device, ports, modelGlb, mode = 'editor', onOpenDevice }: Props) {
  const groupRef = useRef<Group>(null)
  const [tcObject, setTcObject] = useState<Group | null>(null)
  const draggingRef = useRef(false)
  const [glbScene, setGlbScene] = useState<Group | null>(null)
  const [glbFailed, setGlbFailed] = useState(false)
  const selection = useSceneStore((s) => s.selection)
  const transformMode = useSceneStore((s) => s.editorUi.transformMode)
  const wireFrom = useSceneStore((s) => s.editorUi.wireFrom)
  const setSelection = useSceneStore((s) => s.setSelection)
  const setWireFrom = useSceneStore((s) => s.setWireFrom)
  const tryConnectPorts = useSceneStore((s) => s.tryConnectPorts)
  const updateDeviceTransform = useSceneStore((s) => s.updateDeviceTransform)
  const setError = useSceneStore((s) => s.setError)

  const isDeviceSelected = selection?.kind === 'device' && selection.deviceId === device.id

  const bindGroupRef = (node: Group | null) => {
    groupRef.current = node
    setTcObject(node)
  }

  useEffect(() => {
    if (!modelGlb) return
    const loader = new GLTFLoader()
    let cancelled = false
    loader.load(
      `/equipment/${device.assetId}/model.glb`,
      (gltf) => {
        if (cancelled) return
        setGlbScene(gltf.scene.clone(true))
        setGlbFailed(false)
      },
      undefined,
      (err) => {
        console.error('[twin-web] GLB 加载失败', device.assetId, err)
        if (!cancelled) {
          setGlbFailed(true)
          setGlbScene(null)
          if (mode === 'editor') {
            setError(`GLB 加载失败：${device.assetId}（已使用占位体）`)
          }
        }
      },
    )
    return () => {
      cancelled = true
      setGlbScene(null)
      setGlbFailed(false)
    }
  }, [device.assetId, device.id, mode, modelGlb, setError])

  useLayoutEffect(() => {
    const g = groupRef.current
    if (!g || draggingRef.current) return
    g.position.set(device.position[0], device.position[1], device.position[2])
    const e = eulerDegToThreeEuler(device.rotation[0], device.rotation[1], device.rotation[2])
    g.rotation.copy(e)
  }, [device.position, device.rotation])

  const [hx, hy, hz] = device.boundsHalfExtents
  const baseColor = isDeviceSelected ? sceneTheme.deviceSelected : sceneTheme.deviceIdle
  const emissiveColor = isDeviceSelected ? sceneTheme.deviceSelectedEmissive : sceneTheme.deviceIdleEmissive
  const emissiveIntensity = isDeviceSelected
    ? sceneTheme.deviceSelectedEmissiveIntensity
    : sceneTheme.deviceIdleEmissiveIntensity

  const handleGroupClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (mode === 'viewer') {
      onOpenDevice?.(device.id)
      return
    }
    setSelection({ kind: 'device', deviceId: device.id })
  }

  const handlePortPick = (portId: string) => {
    if (wireFrom) {
      if (wireFrom.deviceId === device.id && wireFrom.portId === portId) {
        setWireFrom(null)
        return
      }
      tryConnectPorts(wireFrom, { deviceId: device.id, portId })
      return
    }
    setWireFrom({ deviceId: device.id, portId })
    setSelection({ kind: 'port', deviceId: device.id, portId })
  }

  return (
    <group>
      <group ref={bindGroupRef} onClick={handleGroupClick}>
        {modelGlb && glbScene && !glbFailed ? (
          <primitive object={glbScene} />
        ) : (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[hx * 2, hy * 2, hz * 2]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={emissiveColor}
              emissiveIntensity={emissiveIntensity}
              metalness={0.26}
              roughness={0.52}
            />
          </mesh>
        )}
        {mode === 'editor' &&
          ports.map((p) => (
            <PortMarker
              key={p.id}
              device={device}
              port={p}
              selected={selection?.kind === 'port' && selection.deviceId === device.id && selection.portId === p.id}
              wireActive={!!wireFrom}
              onPick={() => handlePortPick(p.id)}
            />
          ))}
      </group>

      {isDeviceSelected && tcObject ? (
        <TransformControls
          object={tcObject}
          mode={transformMode}
          onMouseDown={() => {
            draggingRef.current = true
          }}
          onMouseUp={() => {
            draggingRef.current = false
            const g = groupRef.current
            if (!g) return
            updateDeviceTransform(
              device.id,
              [g.position.x, g.position.y, g.position.z],
              eulerThreeToDegTuple(g.rotation),
            )
          }}
        />
      ) : null}
    </group>
  )
}
