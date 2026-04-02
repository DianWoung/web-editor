import path from 'node:path'

import { readJsonFile } from './fileStore.ts'
import { generateRuntimeDevice, generateRuntimeOverview } from './runtimeGenerator.ts'
import { readRuntimeSnapshot } from './runtimeSnapshot.ts'
import { sceneFileSchema, type RuntimeDevice, type RuntimeOverview } from '../schemas.ts'

async function loadCurrentScene(dataRoot: string) {
  return readJsonFile(path.join(dataRoot, 'scene', 'current.scene.json'), sceneFileSchema)
}

export async function getRuntimeOverview(dataRoot: string): Promise<RuntimeOverview> {
  const scene = await loadCurrentScene(dataRoot)
  const snapshot = await readRuntimeSnapshot(dataRoot)

  if (snapshot?.overview) {
    return snapshot.overview
  }

  return generateRuntimeOverview(scene.devices)
}

export async function getRuntimeDevice(dataRoot: string, deviceId: string): Promise<RuntimeDevice | null> {
  const scene = await loadCurrentScene(dataRoot)
  const sceneDevice = scene.devices.find((device) => device.id === deviceId)
  if (!sceneDevice) {
    return null
  }

  const snapshot = await readRuntimeSnapshot(dataRoot)
  return snapshot?.devices[deviceId] ?? generateRuntimeDevice(sceneDevice)
}
