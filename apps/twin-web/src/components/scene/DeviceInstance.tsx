import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text, TransformControls } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AnimationMixer, Box3, Vector3 } from 'three'
import type { Group } from 'three'
import type { Device } from '@/schemas/device'
import type { PortDef } from '@/schemas/port'
import { useSceneStore } from '@/store/sceneStore'
import { eulerDegToThreeEuler, eulerThreeToDegTuple } from '@/utils/degrees'
import { PortMarker } from '@/components/scene/PortMarker'
import { sceneTheme } from '@/theme/sceneTheme'
import type { RenderStyle } from '@/services/loadEquipmentCatalog'
import { applyGltfScenePerformanceDefaults } from '@/utils/gltfPerformance'
import { isFlowDrivenWindTurbine, shouldUseEmbeddedWindTurbineAnimation } from '@/components/scene/windTurbineAnimation'

type Props = {
  device: Device
  ports: PortDef[]
  /** GLB 资源 URL；为空时走占位几何渲染 */
  modelUrl?: string | null
  /** 占位多面体渲染风格 */
  renderStyle?: RenderStyle
  /** 运行态开关：开启时让带旋转结构的设备启动动画 */
  flowEnabled?: boolean
  /** editor：编排交互；viewer：总览只读，点击进详情 */
  mode?: 'editor' | 'viewer'
  onOpenDevice?: (deviceId: string) => void
}

export function DeviceInstance({
  device,
  ports,
  modelUrl,
  renderStyle = 'box',
  flowEnabled = false,
  mode = 'editor',
  onOpenDevice,
}: Props) {
  const groupRef = useRef<Group>(null)
  const modelVisualRef = useRef<Group>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const loadedSceneRef = useRef<Group | null>(null)
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
  const shouldSpinWithFlow = isFlowDrivenWindTurbine(device.assetId)

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
        const prevScene = loadedSceneRef.current
        const useEmbeddedAnimation = shouldUseEmbeddedWindTurbineAnimation(device.assetId, gltf.animations.length)
        mixerRef.current?.stopAllAction()
        if (mixerRef.current && prevScene) {
          mixerRef.current.uncacheRoot(prevScene)
        }
        loadedSceneRef.current = scene
        mixerRef.current = useEmbeddedAnimation ? new AnimationMixer(scene) : null
        if (mixerRef.current) {
          gltf.animations.forEach((clip) => {
            mixerRef.current?.clipAction(clip).play()
          })
          mixerRef.current.timeScale = flowEnabled ? 1 : 0
        }
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
      mixerRef.current?.stopAllAction()
      if (mixerRef.current && loadedSceneRef.current) {
        mixerRef.current.uncacheRoot(loadedSceneRef.current)
      }
      mixerRef.current = null
      loadedSceneRef.current = null
      setGlbScene(null)
      setGlbFailed(false)
    }
  }, [device.assetId, device.id, mode, modelUrl, setError, shouldSpinWithFlow])

  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer) return
    mixer.timeScale = flowEnabled && shouldSpinWithFlow ? 1 : 0
  }, [flowEnabled, shouldSpinWithFlow])

  useFrame((_, delta) => {
    const mixer = mixerRef.current
    if (mixer && flowEnabled && shouldSpinWithFlow) {
      mixer.update(delta)
    }
  })

  useLayoutEffect(() => {
    const g = groupRef.current
    if (!g || draggingRef.current) return
    g.position.set(device.position[0], device.position[1], device.position[2])
    const e = eulerDegToThreeEuler(device.rotation[0], device.rotation[1], device.rotation[2])
    g.rotation.copy(e)
  }, [device.position, device.rotation])

  const [hx, hy, hz] = device.boundsHalfExtents
  /** 性能兜底：编辑态只对“当前选中设备”显示名称，避免大量 `Text/Billboard` 成为开销。 */
  const showLabel = mode === 'viewer' ? true : isDeviceSelected

  const [modelTopLocal, setModelTopLocal] = useState<[number, number, number]>([0, hy, 0])

  useLayoutEffect(() => {
    let cancelled = false
    let next: [number, number, number] = [0, hy, 0]
    // 未启用/未加载到可测量的视觉模型，回退到包围盒近似
    if (!showLabel || !modelUrl || !glbScene || glbFailed || !groupRef.current || !modelVisualRef.current) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setModelTopLocal(next)
      })
      return () => {
        cancelled = true
      }
    }

    // 使用“当前朝向下”的视觉模型包围盒顶部点，并转换到父级局部坐标
    // 这样可实现你选择的 B：文字跟随模型旋转后的“局部顶面最高点”贴合。
    const box = new Box3().setFromObject(modelVisualRef.current)
    if (box.isEmpty()) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setModelTopLocal(next)
      })
      return () => {
        cancelled = true
      }
    }

    const topCenterWorld = new Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2)
    const local = groupRef.current.worldToLocal(topCenterWorld)
    next = [local.x, local.y, local.z]
    Promise.resolve().then(() => {
      if (cancelled) return
      setModelTopLocal(next)
    })
    // label 在设备变换时需要重新贴合
    return () => {
      cancelled = true
    }
  }, [showLabel, modelUrl, glbScene, glbFailed, hy, device.position, device.rotation])

  const labelFontSize =
    mode === 'viewer'
      ? Math.min(0.32 + Math.max(hx, hz) * 0.06, 0.62)
      : Math.min(0.18 + Math.max(hx, hz) * 0.04, 0.32)
  /** 包围盒顶面正上方：文字 anchorY=bottom，故 Y 为字形底缘，紧贴模型顶留一小缝 */
  const labelY = modelTopLocal[1] + labelFontSize * 0.52 + 0.05
  const labelX = modelTopLocal[0]
  const labelZ = modelTopLocal[2]
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
        {/* 视觉模型根节点：用于测量“模型在当前朝向下的顶部点” */}
        <group ref={modelVisualRef}>
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
        {showLabel ? (
          <Billboard follow position={[labelX, labelY, labelZ]}>
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
        ) : null}
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
