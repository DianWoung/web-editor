import { z } from 'zod'
import { deviceSchema } from '@/schemas/device'
import { pipeSchema } from '@/schemas/pipe'
import { portGroupSchema } from '@/schemas/port'

export const sceneFileSchema = z.object({
  /** 场景文件格式版本，用于迁移；与设备 asset.json 的 assetVersion 独立 */
  version: z.number().int().positive(),
  devices: z.array(deviceSchema),
  portGroups: z.array(portGroupSchema),
  pipes: z.array(pipeSchema),
})

export type SceneFile = z.infer<typeof sceneFileSchema>

export function parseSceneJson(data: unknown) {
  return sceneFileSchema.safeParse(data)
}

export function formatSceneParseError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
}
