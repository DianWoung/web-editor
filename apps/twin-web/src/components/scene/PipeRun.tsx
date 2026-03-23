import { useMemo, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'
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
  }, [colorHex, conflict, pipe.id, points, selected])

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
