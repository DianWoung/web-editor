import { z } from 'zod'

export const portDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** 设备局部坐标（米），Y 向上 */
  position: z.tuple([z.number(), z.number(), z.number()]),
  system: z.string().min(1),
  direction: z.string().min(1),
})

export type PortDef = z.infer<typeof portDefSchema>

/** 与方案文档 5.1 port 块一致：按设备聚合 */
export const portGroupSchema = z.object({
  deviceId: z.string().min(1),
  ports: z.array(portDefSchema),
})

export type PortGroup = z.infer<typeof portGroupSchema>
