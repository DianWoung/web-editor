import {
  getCurrentScene,
  getNamedScene,
  getNamedScenes,
  loadNamedScene,
  resetDemoScene,
  saveCurrentScene,
  saveNamedScene,
  updateNamedScene,
} from '@/services/api/sceneApi'
import type { SceneLibraryResponse } from '@/schemas/scene'
import { useSceneStore } from '@/store/sceneStore'
import type { SceneFile } from '@/schemas/scene'

type ServiceResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function applySceneToStore(scene: SceneFile) {
  useSceneStore.getState().replaceScene(scene)
}

export async function loadCurrentSceneIntoStore(): Promise<ServiceResult> {
  try {
    applySceneToStore(await getCurrentScene())
    return { ok: true, data: undefined }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function loadDemoSceneIntoStore(): Promise<ServiceResult> {
  try {
    applySceneToStore(await resetDemoScene())
    return { ok: true, data: undefined }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function saveCurrentSceneFromStore(): Promise<ServiceResult<{ updatedAt: string }>> {
  try {
    const text = useSceneStore.getState().exportSceneJson()
    const scene = JSON.parse(text) as SceneFile
    const result = await saveCurrentScene(scene)
    return { ok: true, data: { updatedAt: result.updatedAt } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function listNamedScenes(): Promise<ServiceResult<SceneLibraryResponse>> {
  try {
    return { ok: true, data: await getNamedScenes() }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function createNamedSceneFromStore(name: string): Promise<ServiceResult<{ sceneId: string; name: string; updatedAt: string }>> {
  try {
    const text = useSceneStore.getState().exportSceneJson()
    const scene = JSON.parse(text) as SceneFile
    const result = await saveNamedScene(name, scene)
    return { ok: true, data: result }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function loadNamedSceneIntoStore(sceneId: string): Promise<ServiceResult<{ name?: string }>> {
  try {
    applySceneToStore(await loadNamedScene(sceneId))
    return { ok: true, data: {} }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function fetchNamedScene(sceneId: string): Promise<ServiceResult<SceneFile>> {
  try {
    return { ok: true, data: await getNamedScene(sceneId) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function createEmptyNamedScene(name: string): Promise<ServiceResult<{ sceneId: string; name: string; updatedAt: string }>> {
  try {
    const result = await saveNamedScene(name, { version: 1, devices: [], portGroups: [], pipes: [] })
    return { ok: true, data: result }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function saveNamedSceneFromStore(sceneId: string): Promise<ServiceResult<{ updatedAt: string }>> {
  try {
    const text = useSceneStore.getState().exportSceneJson()
    const scene = JSON.parse(text) as SceneFile
    const result = await updateNamedScene(sceneId, scene)
    return { ok: true, data: { updatedAt: result.updatedAt } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
