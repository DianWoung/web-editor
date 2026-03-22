import { z } from 'zod'

export const pipeSchema = z.object({
  id: z.string().min(1),
  /** `deviceId.portId`，与方案 5.1 一致 */
  from: z.string().min(1),
  to: z.string().min(1),
  system: z.string().min(1),
  routeType: z.literal('orthogonal'),
  level: z.string().min(1),
})

export type Pipe = z.infer<typeof pipeSchema>
