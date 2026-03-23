import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { Color, Quaternion, ShaderMaterial, Vector3 } from 'three'
import type { Pipe } from '@/schemas/pipe'
import type { Device } from '@/schemas/device'
import type { PortGroup } from '@/schemas/port'
import { systemColor } from '@/constants/systemColors'
import { buildOrthogonalRoute } from '@/services/orthogonalRoute'
import { parsePipeEndpoint, pipeSegmentsCollideDevices } from '@/services/pipeCollision'
import { getPortWorldPosition } from '@/utils/portWorld'
import { sceneTheme } from '@/theme/sceneTheme'

const _axis = new Vector3(0, 1, 0)

type Props = {
  pipe: Pipe
  devices: Device[]
  portGroups: PortGroup[]
  /** 运行态：流动虚线效果（仅直管段） */
  flowEnabled?: boolean
  /** 编排页可点选管线 */
  editorInteractive?: boolean
  selected?: boolean
  onSelectPipe?: (pipeId: string) => void
}

function resolveEndpointWorld(
  ref: string,
  devices: Device[],
  portGroups: PortGroup[],
  target: Vector3,
): boolean {
  const parsed = parsePipeEndpoint(ref)
  if (!parsed) return false
  const dev = devices.find((d) => d.id === parsed.deviceId)
  const pg = portGroups.find((g) => g.deviceId === parsed.deviceId)
  const port = pg?.ports.find((p) => p.id === parsed.portId)
  if (!dev || !port) return false
  getPortWorldPosition(dev, port, target)
  return true
}

export function PipeRun({
  pipe,
  devices,
  portGroups,
  flowEnabled = false,
  editorInteractive,
  selected,
  onSelectPipe,
}: Props) {
  const layout = useMemo(() => {
    const a = new Vector3()
    const b = new Vector3()
    const okA = resolveEndpointWorld(pipe.from, devices, portGroups, a)
    const okB = resolveEndpointWorld(pipe.to, devices, portGroups, b)
    if (!okA || !okB) {
      return { points: [] as Vector3[], conflict: false, colorHex: systemColor(pipe.system) }
    }
    const pts = buildOrthogonalRoute(a, b)
    const pa = parsePipeEndpoint(pipe.from)
    const pb = parsePipeEndpoint(pipe.to)
    const exclude = new Set<string>()
    if (pa) exclude.add(pa.deviceId)
    if (pb) exclude.add(pb.deviceId)
    const conflict = pipeSegmentsCollideDevices(pts, devices, exclude)
    const colorHex = conflict ? sceneTheme.pipeConflict : systemColor(pipe.system)
    return { points: pts, conflict, colorHex }
  }, [devices, portGroups, pipe])

  const { points, conflict, colorHex } = layout

  const flowMaterial = useMemo(() => {
    if (!flowEnabled) return null

    const baseColor = new Color(colorHex)
    const glowColor =
      selected && !conflict ? new Color('#2a8faf') : conflict ? new Color(sceneTheme.pipeConflict) : baseColor
    const glowStrength = selected && !conflict ? 1.15 : conflict ? 1.0 : 0.65

    const mat = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: baseColor },
        uGlowColor: { value: glowColor },
        uGlowStrength: { value: glowStrength },
        uSpeed: { value: 0.85 },
        uDashCount: { value: 9 },
        uDashWidth: { value: 0.28 },
        uDashSoft: { value: 0.08 },
        uLightDir: { value: new Vector3(0.3, 1.0, 0.2).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalW;
        void main() {
          vUv = uv;
          vNormalW = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uGlowColor;
        uniform float uGlowStrength;
        uniform float uSpeed;
        uniform float uDashCount;
        uniform float uDashWidth;
        uniform float uDashSoft;
        uniform vec3 uLightDir;
        varying vec2 vUv;
        varying vec3 vNormalW;

        void main() {
          float t = fract((vUv.y + uTime * uSpeed) * uDashCount);
          float on = 1.0 - smoothstep(uDashWidth, uDashWidth + uDashSoft, t);

          float diff = max(dot(vNormalW, normalize(uLightDir)), 0.0);
          vec3 base = uBaseColor * (0.22 + diff * 0.78);
          vec3 glow = uGlowColor * on * uGlowStrength;
          vec3 col = base + glow;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })

    return mat
  }, [colorHex, conflict, flowEnabled, selected])

  const flowMaterialRef = useRef<ShaderMaterial | null>(null)

  useEffect(() => {
    flowMaterialRef.current = flowMaterial
  }, [flowMaterial])

  useEffect(() => {
    return () => {
      flowMaterial?.dispose()
    }
  }, [flowMaterial])

  useFrame((state) => {
    if (!flowEnabled) return
    const mat = flowMaterialRef.current
    if (!mat) return
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })

  const segments = useMemo(() => {
    if (points.length < 2) return null
    const out: ReactNode[] = []

    const selEmissive = selected && !conflict ? '#2a8faf' : conflict ? sceneTheme.pipeConflictEmissive : '#000000'
    const selEmissiveInt = selected && !conflict ? 0.22 : conflict ? 0.28 : 0

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i]!
      const p1 = points[i + 1]!
      const dir = new Vector3().subVectors(p1, p0)
      const len = dir.length()
      if (len < 1e-6) continue
      dir.normalize()
      // 每段使用独立 Vector3 / Quaternion：复用同一对象会导致 R3F 提交时全部被写成最后一段的朝向
      const mid = new Vector3().addVectors(p0, p1).multiplyScalar(0.5)
      const q = new Quaternion().setFromUnitVectors(_axis, dir)

      out.push(
        <mesh key={`seg-${pipe.id}-${i}`} position={mid} quaternion={q} scale={[1, len, 1]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1, 12]} />
          {flowMaterial ? (
            <primitive object={flowMaterial} attach="material" />
          ) : (
            <meshStandardMaterial
              color={colorHex}
              emissive={selEmissive}
              emissiveIntensity={selEmissiveInt}
              metalness={0.25}
              roughness={0.45}
            />
          )}
        </mesh>,
      )
    }

    for (let j = 1; j < points.length - 1; j++) {
      const p = points[j]!
      out.push(
        <mesh key={`elbow-${pipe.id}-${j}`} position={p} castShadow>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial
            color={colorHex}
            emissive={selEmissive}
            emissiveIntensity={selEmissiveInt}
            metalness={0.25}
            roughness={0.45}
          />
        </mesh>,
      )
    }

    return out
  }, [colorHex, conflict, pipe.id, points, selected, flowMaterial])

  if (!segments) return null

  const handleGroupClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (editorInteractive) onSelectPipe?.(pipe.id)
  }

  return (
    <group onClick={editorInteractive ? handleGroupClick : undefined}>
      {segments}
    </group>
  )
}
