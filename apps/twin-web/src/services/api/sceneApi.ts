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
  remark: string
  updatedAt: string
}

const fallbackSceneId = 'scene-mnml2vt7'

const fallbackScene: SceneFile = {
  version: 1,
  devices: [
    {
      id: 'CH-7f8c134e',
      type: 'chiller',
      name: '大型风冷冷水机组',
      assetId: 'large_air_cooled_chiller_iot_v1',
      position: [0, 2.1, 0],
      rotation: [0, 0, 0],
      system: 'CHW',
      tags: [],
      boundsHalfExtents: [8.8, 2.1, 2.3],
    },
    {
      id: 'PUMP-bb3b4c14',
      type: 'heat-exchanger',
      name: '板式换热器模组',
      assetId: 'plate_heat_exchanger_iot_v1',
      position: [0, 1.0575731679079015, -17.389998882333472],
      rotation: [0, 0, 0],
      system: 'CHW',
      tags: [],
      boundsHalfExtents: [3.1, 4.2, 1.8],
    },
  ],
  portGroups: [
    {
      deviceId: 'CH-7f8c134e',
      ports: [
        {
          id: 'chw_in',
          name: '冷冻回水入口',
          position: [-1, 0.95, -3.02],
          system: 'CHW',
          direction: 'in',
        },
        {
          id: 'chw_out',
          name: '冷冻供水出口',
          position: [1, 0.95, -3.02],
          system: 'CHW',
          direction: 'out',
        },
      ],
    },
    {
      deviceId: 'PUMP-bb3b4c14',
      ports: [
        {
          id: 'primary_in',
          name: '一次侧入口',
          position: [-2.85, 1.7, 1.2],
          system: 'CHW',
          direction: 'in',
        },
        {
          id: 'primary_out',
          name: '一次侧出口',
          position: [-2.85, 4.95, -1.2],
          system: 'CHW',
          direction: 'out',
        },
        {
          id: 'secondary_in',
          name: '二次侧入口',
          position: [2.85, 1.7, 1.2],
          system: 'CHW2',
          direction: 'in',
        },
        {
          id: 'secondary_out',
          name: '二次侧出口',
          position: [2.85, 4.95, -1.2],
          system: 'CHW2',
          direction: 'out',
        },
      ],
    },
  ],
  pipes: [],
}

const fallbackSceneLibrary: SceneLibraryResponse = {
  items: [
    {
      id: fallbackSceneId,
      name: '风力供热电站',
      remark: '',
      updatedAt: '2026-04-19T08:15:53.490Z',
      deviceCount: fallbackScene.devices.length,
      pipeCount: fallbackScene.pipes.length,
      isCurrent: true,
    },
  ],
}

function shouldUseSceneFallback(error: unknown) {
  if (!(error instanceof Error)) return false
  return /HTTP 502|Failed to fetch|NetworkError/i.test(error.message)
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
  try {
    return parseSceneResponse(await apiRequest<unknown>('/scene'))
  } catch (error) {
    if (shouldUseSceneFallback(error)) {
      return fallbackScene
    }
    throw error
  }
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
  try {
    return parseSceneLibraryApiResponse(await apiRequest<unknown>('/scene/library'))
  } catch (error) {
    if (shouldUseSceneFallback(error)) {
      return fallbackSceneLibrary
    }
    throw error
  }
}

export async function saveNamedScene(name: string, remark: string, scene: SceneFile): Promise<SaveNamedSceneResponse> {
  return apiRequest<SaveNamedSceneResponse>('/scene/library', {
    method: 'POST',
    body: JSON.stringify({ name, remark, scene }),
  })
}

export async function updateNamedScene(
  sceneId: string,
  payload: { name: string; remark: string; scene: SceneFile },
): Promise<SaveNamedSceneResponse> {
  return apiRequest<SaveNamedSceneResponse>(`/scene/library/${encodeURIComponent(sceneId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getNamedScene(sceneId: string): Promise<SceneFile> {
  try {
    return parseSceneResponse(await apiRequest<unknown>(`/scene/library/${encodeURIComponent(sceneId)}`))
  } catch (error) {
    if (shouldUseSceneFallback(error) && sceneId === fallbackSceneId) {
      return fallbackScene
    }
    throw error
  }
}

export async function loadNamedScene(sceneId: string): Promise<SceneFile> {
  try {
    return parseSceneResponse(
      await apiRequest<unknown>(`/scene/library/${encodeURIComponent(sceneId)}/load`, {
        method: 'POST',
      }),
    )
  } catch (error) {
    if (shouldUseSceneFallback(error) && sceneId === fallbackSceneId) {
      return fallbackScene
    }
    throw error
  }
}

export async function deleteNamedScene(sceneId: string): Promise<{ ok: true; sceneId: string }> {
  return apiRequest<{ ok: true; sceneId: string }>(`/scene/library/${encodeURIComponent(sceneId)}`, {
    method: 'DELETE',
  })
}
