import { apiRequest } from '@/services/api/client'
import { formatSceneParseError, parseSceneJson, type SceneFile } from '@/schemas/scene'

type SaveSceneResponse = {
  ok: true
  updatedAt: string
}

function parseSceneResponse(data: unknown): SceneFile {
  const parsed = parseSceneJson(data)
  if (!parsed.success) {
    throw new Error(`场景响应校验失败：\n${formatSceneParseError(parsed.error)}`)
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
