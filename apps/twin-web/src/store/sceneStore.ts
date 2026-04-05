import { create } from 'zustand'

import type { Device } from '@/schemas/device'
import type { Pipe } from '@/schemas/pipe'
import type { PortGroup } from '@/schemas/port'
import { formatSceneParseError, parseSceneJson, type SceneFile } from '@/schemas/scene'
import type { CatalogAsset } from '@/services/loadEquipmentCatalog'
import { useEditorUiStore } from '@/store/editorUiStore'
import { snapVec3 } from '@/utils/snap'
import { TRUNK_Y } from '@/constants/trunk'

export type Selection =
  | { kind: 'device'; deviceId: string }
  | { kind: 'port'; deviceId: string; portId: string }
  | { kind: 'pipe'; pipeId: string }
  | null

type SceneState = {
  version: number
  devices: Device[]
  portGroups: PortGroup[]
  pipes: Pipe[]
  selection: Selection
}

type SceneActions = {
  setSelection: (selection: Selection) => void
  loadScene: (scene: SceneFile) => void
  clearScene: () => void
  addDeviceFromAsset: (asset: CatalogAsset, position?: [number, number, number]) => void
  updateDeviceTransform: (
    deviceId: string,
    position: [number, number, number],
    rotationDeg: [number, number, number],
  ) => void
  updateDeviceName: (deviceId: string, name: string) => void
  updateDeviceSystem: (deviceId: string, system: string) => void
  removeDevice: (deviceId: string) => void
  duplicateDevice: (deviceId: string) => void
  removePipe: (pipeId: string) => void
  tryConnectPorts: (a: { deviceId: string; portId: string }, b: { deviceId: string; portId: string }) => void
  exportSceneJson: () => string
  importSceneJsonText: (text: string) => boolean
  applyStressTest: (count: number) => void
}

function newDeviceId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function newPipeId() {
  return `PIPE-${crypto.randomUUID().slice(0, 8)}`
}

function parsePipeEndpointRef(ref: string): { deviceId: string; portId: string } | null {
  const [deviceId, portId] = ref.split('.')
  if (!deviceId || !portId) return null
  return { deviceId, portId }
}

const initial: SceneState = {
  version: 1,
  devices: [],
  portGroups: [],
  pipes: [],
  selection: null,
}

export const useSceneStore = create<SceneState & SceneActions>((set, get) => ({
  ...initial,

  setSelection: (selection) => set({ selection }),

  loadScene: (scene) => {
    useEditorUiStore.getState().resetTransientState()
    set({
      version: scene.version,
      devices: scene.devices,
      portGroups: scene.portGroups,
      pipes: scene.pipes,
      selection: null,
    })
  },

  clearScene: () => {
    useEditorUiStore.getState().reset()
    set({
      ...initial,
    })
  },

  addDeviceFromAsset: (asset, position) => {
    const id = newDeviceId(asset.type === 'chiller' ? 'CH' : 'PUMP')
    const [, hy] = asset.halfExtents
    const g = useEditorUiStore.getState().snapGrid
    const raw: [number, number, number] = position
      ? [position[0], hy, position[2]]
      : [0, hy, 0]
    const pos = g > 0 ? snapVec3(raw, g) : raw
    pos[1] = hy
    const device: Device = {
      id,
      type: asset.type,
      name: `${asset.displayName}`,
      assetId: asset.assetId,
      position: pos,
      rotation: [0, 0, 0],
      system: asset.defaultSystem,
      tags: [],
      boundsHalfExtents: asset.halfExtents,
    }
    const pg: PortGroup = {
      deviceId: id,
      ports: asset.portsTemplate.map((p) => ({ ...p })),
    }
    set((s) => ({
      devices: [...s.devices, device],
      portGroups: [...s.portGroups, pg],
      selection: { kind: 'device', deviceId: id },
    }))
  },

  updateDeviceTransform: (deviceId, position, rotationDeg) => {
    const g = useEditorUiStore.getState().snapGrid
    const pos = g > 0 ? snapVec3(position, g) : position
    set((s) => ({
      devices: s.devices.map((d) => (d.id === deviceId ? { ...d, position: pos, rotation: rotationDeg } : d)),
    }))
  },

  updateDeviceName: (deviceId, name) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === deviceId ? { ...d, name } : d)),
    })),

  updateDeviceSystem: (deviceId, system) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === deviceId ? { ...d, system } : d)),
    })),

  removeDevice: (deviceId) =>
    set((s) => {
      const devices = s.devices.filter((d) => d.id !== deviceId)
      const portGroups = s.portGroups.filter((g) => g.deviceId !== deviceId)
      const pipes = s.pipes.filter((p) => {
        const fa = parsePipeEndpointRef(p.from)
        const tb = parsePipeEndpointRef(p.to)
        if (!fa || !tb) return true
        return fa.deviceId !== deviceId && tb.deviceId !== deviceId
      })
      let selection = s.selection
      if (selection?.kind === 'device' && selection.deviceId === deviceId) selection = null
      if (selection?.kind === 'port' && selection.deviceId === deviceId) selection = null
      return { devices, portGroups, pipes, selection }
    }),

  duplicateDevice: (deviceId) => {
    const d = get().devices.find((x) => x.id === deviceId)
    const pg = get().portGroups.find((g) => g.deviceId === deviceId)
    if (!d || !pg) return
    const newId = newDeviceId(d.type === 'chiller' ? 'CH' : 'PUMP')
    const g = useEditorUiStore.getState().snapGrid
    const raw: [number, number, number] = [d.position[0] + 1.5, d.position[1], d.position[2] + 1.2]
    const position = g > 0 ? snapVec3(raw, g) : raw
    const device: Device = {
      ...d,
      id: newId,
      name: `${d.name} 副本`,
      position,
    }
    const npg: PortGroup = {
      deviceId: newId,
      ports: pg.ports.map((p) => ({ ...p })),
    }
    set((s) => ({
      devices: [...s.devices, device],
      portGroups: [...s.portGroups, npg],
      selection: { kind: 'device', deviceId: newId },
    }))
  },

  removePipe: (pipeId) =>
    set((s) => ({
      pipes: s.pipes.filter((p) => p.id !== pipeId),
      selection:
        s.selection?.kind === 'pipe' && s.selection.pipeId === pipeId ? null : s.selection,
    })),

  tryConnectPorts: (from, to) => {
    void (async () => {
      const a = from
      const b = to
      if (a.deviceId === b.deviceId && a.portId === b.portId) return

      const devA = get().devices.find((d) => d.id === a.deviceId)
      const devB = get().devices.find((d) => d.id === b.deviceId)
      if (!devA || !devB) return

      const pgA = get().portGroups.find((g) => g.deviceId === a.deviceId)
      const pgB = get().portGroups.find((g) => g.deviceId === b.deviceId)
      if (!pgA || !pgB) return
      if (!pgA.ports.some((p) => p.id === a.portId)) return
      if (!pgB.ports.some((p) => p.id === b.portId)) return

      const fromRef = `${a.deviceId}.${a.portId}`
      const toRef = `${b.deviceId}.${b.portId}`

      const dup = get().pipes.some(
        (p) =>
          (p.from === fromRef && p.to === toRef) || (p.from === toRef && p.to === fromRef),
      )
      if (dup) {
        useEditorUiStore.getState().setError('该两端口之间已有管线，未重复添加。')
        return
      }

      const system =
        pgA.ports.find((p) => p.id === a.portId)?.system ??
        pgB.ports.find((p) => p.id === b.portId)?.system ??
        devA.system

      const portA = pgA.ports.find((p) => p.id === a.portId)
      const portB = pgB.ports.find((p) => p.id === b.portId)
      if (!portA || !portB) return

      const [{ Vector3 }, { getPortWorldPosition }, { buildOrthogonalRoute }, { pipeSegmentsCollideDevices }] =
        await Promise.all([
          import('three'),
          import('@/utils/portWorld'),
          import('@/services/orthogonalRoute'),
          import('@/services/pipeCollision'),
        ])

      const wa = new Vector3()
      const wb = new Vector3()
      getPortWorldPosition(devA, portA, wa)
      getPortWorldPosition(devB, portB, wb)
      const pipeEndpointTrim = 0.09
      const pts = buildOrthogonalRoute(wa, wb, TRUNK_Y, pipeEndpointTrim)
      const exclude = new Set<string>()
      const pipeCollisionInflate = 0.03
      const pipeIgnoreEndpoint = 0.05
      const conflict = pipeSegmentsCollideDevices(
        pts,
        get().devices,
        exclude,
        pipeCollisionInflate,
        pipeIgnoreEndpoint,
      )
      if (conflict) {
        useEditorUiStore.getState().setError('该连接会与设备包围盒冲突，已阻止生成管线。')
        return
      }

      const stillDuplicate = get().pipes.some(
        (p) =>
          (p.from === fromRef && p.to === toRef) || (p.from === toRef && p.to === fromRef),
      )
      if (stillDuplicate) {
        useEditorUiStore.getState().setError('该两端口之间已有管线，未重复添加。')
        return
      }

      const pipe: Pipe = {
        id: newPipeId(),
        from: fromRef,
        to: toRef,
        system,
        routeType: 'orthogonal',
        level: 'main',
      }

      set((s) => ({
        pipes: [...s.pipes, pipe],
      }))
      useEditorUiStore.getState().resetTransientState()
    })()
  },

  exportSceneJson: () => {
    const { version, devices, portGroups, pipes } = get()
    const scene: SceneFile = { version, devices, portGroups, pipes }
    return JSON.stringify(scene, null, 2)
  },

  importSceneJsonText: (text) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      useEditorUiStore.getState().setError('JSON 解析失败：内容不是合法 JSON')
      return false
    }
    const res = parseSceneJson(parsed)
    if (!res.success) {
      useEditorUiStore.getState().setError(formatSceneParseError(res.error))
      return false
    }
    get().loadScene(res.data)
    return true
  },

  applyStressTest: (count) => {
    const n = Math.max(1, Math.min(500, Math.floor(count)))
    const devices: Device[] = []
    const portGroups: PortGroup[] = []
    const pipes: Pipe[] = []

    const mk = (i: number): Device => ({
      id: `STRESS-${i}`,
      type: 'pump',
      name: `Stress ${i}`,
      assetId: 'chw_pump_v1',
      position: [(Math.random() - 0.5) * 24, 0.35, (Math.random() - 0.5) * 24],
      rotation: [0, Math.random() * 360, 0],
      system: 'CHW',
      tags: [],
      boundsHalfExtents: [0.35, 0.35, 0.35],
    })

    for (let i = 0; i < n; i++) {
      const d = mk(i)
      devices.push(d)
      portGroups.push({
        deviceId: d.id,
        ports: [
          {
            id: 'out',
            name: '出口',
            position: [0.2, 0, 0],
            system: 'CHW',
            direction: 'out',
          },
          {
            id: 'in',
            name: '入口',
            position: [-0.2, 0, 0],
            system: 'CHW',
            direction: 'in',
          },
        ],
      })
    }

    for (let i = 0; i < n - 1; i += 2) {
      const a = devices[i]!
      const b = devices[i + 1]!
      pipes.push({
        id: newPipeId(),
        from: `${a.id}.out`,
        to: `${b.id}.in`,
        system: 'CHW',
        routeType: 'orthogonal',
        level: 'main',
      })
    }

    set({
      version: 1,
      devices,
      portGroups,
      pipes,
      selection: null,
    })
    useEditorUiStore.getState().resetTransientState()
  },
}))
