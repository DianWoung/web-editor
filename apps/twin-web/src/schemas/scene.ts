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

export const sceneLibraryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  updatedAt: z.string().min(1),
  deviceCount: z.number().int().nonnegative(),
  pipeCount: z.number().int().nonnegative(),
  isCurrent: z.boolean(),
})

export const sceneLibraryResponseSchema = z.object({
  items: z.array(sceneLibraryItemSchema),
})

export type SceneFile = z.infer<typeof sceneFileSchema>
export type SceneLibraryItem = z.infer<typeof sceneLibraryItemSchema>
export type SceneLibraryResponse = z.infer<typeof sceneLibraryResponseSchema>

export function parseSceneJson(data: unknown) {
  return sceneFileSchema.safeParse(data)
}

export function parseSceneLibraryResponse(data: unknown) {
  return sceneLibraryResponseSchema.safeParse(data)
}

export function formatSceneParseError(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
}
