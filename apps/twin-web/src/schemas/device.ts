import { z } from 'zod'

/** 欧拉角单位：度，顺序 XYZ（与 Three.js 中 `Euler(..., 'XYZ')` 一致） */
export const deviceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  assetId: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number()]),
  system: z.string().min(1),
  tags: z.array(z.string()).optional(),
  /** 设备局部空间半长，用于占位体与碰撞世界 AABB */
  boundsHalfExtents: z.tuple([z.number(), z.number(), z.number()]),
})

export type Device = z.infer<typeof deviceSchema>
