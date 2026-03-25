import { getCurrentScene, resetDemoScene, saveCurrentScene } from '@/services/api/sceneApi'
import { useSceneStore } from '@/store/sceneStore'
import type { SceneFile } from '@/schemas/scene'

type ServiceResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

function applySceneToStore(scene: SceneFile) {
  useSceneStore.getState().loadScene(scene)
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
