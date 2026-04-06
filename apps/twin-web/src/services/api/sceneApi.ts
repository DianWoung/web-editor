import { apiRequest } from '@/services/api/client'
import {
  formatSceneParseError,
  parseSceneJson,
  parseSceneLibraryResponse,
  type SceneFile,
  type SceneLibraryResponse,
} from '@/schemas/scene'

type SaveSceneResponse = {
  ok: true
  updatedAt: string
}

type SaveNamedSceneResponse = {
  ok: true
  sceneId: string
  name: string
  updatedAt: string
}

function parseSceneResponse(data: unknown): SceneFile {
  const parsed = parseSceneJson(data)
  if (!parsed.success) {
    throw new Error(`场景响应校验失败：\n${formatSceneParseError(parsed.error)}`)
  }
  return parsed.data
}

function parseSceneLibraryApiResponse(data: unknown): SceneLibraryResponse {
  const parsed = parseSceneLibraryResponse(data)
  if (!parsed.success) {
    throw new Error(`场景列表响应校验失败：\n${formatSceneParseError(parsed.error)}`)
  }
  return parsed.data
}

export async function getCurrentScene(): Promise<SceneFile> {
  return parseSceneResponse(await apiRequest<unknown>('/scene'))
}

export async function saveCurrentScene(scene: SceneFile): Promise<SaveSceneResponse> {
  return apiRequest<SaveSceneResponse>('/scene', {
    method: 'PUT',
    body: JSON.stringify(scene),
  })
}

export async function resetDemoScene(): Promise<SceneFile> {
  return parseSceneResponse(
    await apiRequest<unknown>('/scene/reset-demo', {
      method: 'POST',
    }),
  )
}

export async function getNamedScenes(): Promise<SceneLibraryResponse> {
  return parseSceneLibraryApiResponse(await apiRequest<unknown>('/scene/library'))
}

export async function saveNamedScene(name: string, scene: SceneFile): Promise<SaveNamedSceneResponse> {
  return apiRequest<SaveNamedSceneResponse>('/scene/library', {
    method: 'POST',
    body: JSON.stringify({ name, scene }),
  })
}

export async function updateNamedScene(sceneId: string, scene: SceneFile): Promise<SaveNamedSceneResponse> {
  return apiRequest<SaveNamedSceneResponse>(`/scene/library/${encodeURIComponent(sceneId)}`, {
    method: 'PUT',
    body: JSON.stringify(scene),
  })
}

export async function getNamedScene(sceneId: string): Promise<SceneFile> {
  return parseSceneResponse(await apiRequest<unknown>(`/scene/library/${encodeURIComponent(sceneId)}`))
}

export async function loadNamedScene(sceneId: string): Promise<SceneFile> {
  return parseSceneResponse(
    await apiRequest<unknown>(`/scene/library/${encodeURIComponent(sceneId)}/load`, {
      method: 'POST',
    }),
  )
}
