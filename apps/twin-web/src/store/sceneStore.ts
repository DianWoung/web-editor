import { create } from 'zustand'
import type { Device } from '@/schemas/device'
import type { Pipe } from '@/schemas/pipe'
import type { PortGroup } from '@/schemas/port'
import { formatSceneParseError, parseSceneJson, type SceneFile } from '@/schemas/scene'
import type { CatalogAsset } from '@/services/loadEquipmentCatalog'

export type Selection =
  | { kind: 'device'; deviceId: string }
  | { kind: 'port'; deviceId: string; portId: string }
  | null

export type TransformMode = 'translate' | 'rotate'

type SceneState = {
  version: number
  devices: Device[]
  portGroups: PortGroup[]
  pipes: Pipe[]
  selection: Selection
  editorUi: {
    wireFrom: { deviceId: string; portId: string } | null
    transformMode: TransformMode
    lastError: string | null
  }
}

type SceneActions = {
  clearError: () => void
  setError: (msg: string | null) => void
  setSelection: (s: Selection) => void
  setTransformMode: (m: TransformMode) => void
  setWireFrom: (v: { deviceId: string; portId: string } | null) => void
  loadScene: (scene: SceneFile) => void
  clearScene: () => void
  addDeviceFromAsset: (asset: CatalogAsset, position?: [number, number, number]) => void
  updateDeviceTransform: (
    deviceId: string,
    position: [number, number, number],
    rotationDeg: [number, number, number],
  ) => void
  updateDeviceName: (deviceId: string, name: string) => void
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

const initial: SceneState = {
  version: 1,
  devices: [],
  portGroups: [],
  pipes: [],
  selection: null,
  editorUi: {
    wireFrom: null,
    transformMode: 'translate',
    lastError: null,
  },
}

export const useSceneStore = create<SceneState & SceneActions>((set, get) => ({
  ...initial,

  clearError: () =>
    set((s) => ({ editorUi: { ...s.editorUi, lastError: null } })),
  setError: (msg) =>
    set((s) => ({ editorUi: { ...s.editorUi, lastError: msg } })),

  setSelection: (selection) => set({ selection }),
  setTransformMode: (transformMode) =>
    set((s) => ({ editorUi: { ...s.editorUi, transformMode } })),
  setWireFrom: (wireFrom) => set((s) => ({ editorUi: { ...s.editorUi, wireFrom } })),

  loadScene: (scene) =>
    set({
      version: scene.version,
      devices: scene.devices,
      portGroups: scene.portGroups,
      pipes: scene.pipes,
      selection: null,
      editorUi: { ...get().editorUi, wireFrom: null, lastError: null },
    }),

  clearScene: () =>
    set({
      ...initial,
      editorUi: { ...get().editorUi, wireFrom: null, lastError: null },
    }),

  addDeviceFromAsset: (asset, position) => {
    const id = newDeviceId(asset.type === 'chiller' ? 'CH' : 'PUMP')
    const [, hy] = asset.halfExtents
    const pos: [number, number, number] = position ?? [0, hy, 0]
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

  updateDeviceTransform: (deviceId, position, rotationDeg) =>
    set((s) => ({
      devices: s.devices.map((d) =>
        d.id === deviceId ? { ...d, position, rotation: rotationDeg } : d,
      ),
    })),

  updateDeviceName: (deviceId, name) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === deviceId ? { ...d, name } : d)),
    })),

  removePipe: (pipeId) =>
    set((s) => ({
      pipes: s.pipes.filter((p) => p.id !== pipeId),
    })),

  tryConnectPorts: (from, to) => {
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

    const system =
      pgA.ports.find((p) => p.id === a.portId)?.system ??
      pgB.ports.find((p) => p.id === b.portId)?.system ??
      devA.system

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
      editorUi: { ...s.editorUi, wireFrom: null },
    }))
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
      get().setError('JSON 解析失败：内容不是合法 JSON')
      return false
    }
    const res = parseSceneJson(parsed)
    if (!res.success) {
      get().setError(formatSceneParseError(res.error))
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
      editorUi: { ...get().editorUi, wireFrom: null, lastError: null },
    })
  },
}))
