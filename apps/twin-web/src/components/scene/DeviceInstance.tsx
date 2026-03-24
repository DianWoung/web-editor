import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Billboard, Text, TransformControls } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Box3 } from 'three'
import type { Group } from 'three'
import type { Device } from '@/schemas/device'
import type { PortDef } from '@/schemas/port'
import { useSceneStore } from '@/store/sceneStore'
import { eulerDegToThreeEuler, eulerThreeToDegTuple } from '@/utils/degrees'
import { PortMarker } from '@/components/scene/PortMarker'
import { sceneTheme } from '@/theme/sceneTheme'
import type { RenderStyle } from '@/services/loadEquipmentCatalog'
import { applyGltfScenePerformanceDefaults } from '@/utils/gltfPerformance'

type Props = {
  device: Device
  ports: PortDef[]
  /** GLB 资源 URL；为空时走占位几何渲染 */
  modelUrl?: string | null
  /** 占位多面体渲染风格 */
  renderStyle?: RenderStyle
  /** editor：编排交互；viewer：总览只读，点击进详情 */
  mode?: 'editor' | 'viewer'
  onOpenDevice?: (deviceId: string) => void
}

export function DeviceInstance({
  device,
  ports,
  modelUrl,
  renderStyle = 'box',
  mode = 'editor',
  onOpenDevice,
}: Props) {
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
    if (!modelUrl) return
    const loader = new GLTFLoader()
    let cancelled = false
    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return
        const scene = gltf.scene.clone(true)
        applyGltfScenePerformanceDefaults(scene)
        setGlbScene(scene)
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
  }, [device.assetId, device.id, mode, modelUrl, setError])

  useLayoutEffect(() => {
    const g = groupRef.current
    if (!g || draggingRef.current) return
    g.position.set(device.position[0], device.position[1], device.position[2])
    const e = eulerDegToThreeEuler(device.rotation[0], device.rotation[1], device.rotation[2])
    g.rotation.copy(e)
  }, [device.position, device.rotation])

  const [hx, hy, hz] = device.boundsHalfExtents
  const modelTopY = useMemo(() => {
    if (!modelUrl || !glbScene || glbFailed) return hy
    const box = new Box3().setFromObject(glbScene)
    return box.isEmpty() ? hy : box.max.y
  }, [glbFailed, glbScene, hy, modelUrl])

  const labelFontSize = Math.min(0.18 + Math.max(hx, hz) * 0.04, 0.32)
  /** 包围盒顶面正上方：文字 anchorY=bottom，故 Y 为字形底缘，紧贴模型顶留一小缝 */
  const labelY = modelTopY + labelFontSize * 0.52 + 0.05
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
        <group>
          {modelUrl && glbScene && !glbFailed ? (
            <primitive object={glbScene} />
          ) : (
            <mesh
              castShadow
              receiveShadow
              scale={renderStyle === 'box' ? [1, 1, 1] : [hx * 2, hy * 2, hz * 2]}
            >
              {renderStyle === 'box' ? (
                <boxGeometry args={[hx * 2, hy * 2, hz * 2]} />
              ) : renderStyle === 'icosahedron' ? (
                <icosahedronGeometry args={[1, 0]} />
              ) : renderStyle === 'dodecahedron' ? (
                <dodecahedronGeometry args={[1, 0]} />
              ) : renderStyle === 'octahedron' ? (
                <octahedronGeometry args={[1, 0]} />
              ) : (
                <boxGeometry args={[1, 1, 1]} />
              )}
              <meshStandardMaterial
                color={baseColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                metalness={0.26}
                roughness={0.52}
              />
            </mesh>
          )}
        </group>
        {mode === 'editor' &&
          ports.map((p) => (
            <PortMarker
              key={p.id}
              port={p}
              selected={selection?.kind === 'port' && selection.deviceId === device.id && selection.portId === p.id}
              wireActive={!!wireFrom}
              onPick={() => handlePortPick(p.id)}
            />
          ))}
        <Billboard follow position={[0, labelY, 0]}>
          <Text
            fontSize={labelFontSize}
            color={sceneTheme.deviceLabelFill}
            outlineWidth={0.02}
            outlineColor={sceneTheme.deviceLabelOutline}
            anchorX="center"
            anchorY="bottom"
            maxWidth={5}
            textAlign="center"
          >
            {device.name}
          </Text>
        </Billboard>
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
