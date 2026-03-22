import { formatSceneParseError, parseSceneJson } from '@/schemas/scene'
import { useSceneStore } from '@/store/sceneStore'

export async function loadDemoSceneIntoStore(): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/scenes/demo.scene.json')
  if (!res.ok) return { ok: false, error: `示例场景加载失败：HTTP ${res.status}` }
  const json: unknown = await res.json()
  const parsed = parseSceneJson(json)
  if (!parsed.success) {
    return { ok: false, error: `示例场景校验失败：\n${formatSceneParseError(parsed.error)}` }
  }
  useSceneStore.getState().loadScene(parsed.data)
  return { ok: true }
}
