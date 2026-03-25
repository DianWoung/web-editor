import { z } from 'zod'

export const deviceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  assetId: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number()]),
  system: z.string().min(1),
  tags: z.array(z.string()).optional(),
  boundsHalfExtents: z.tuple([z.number(), z.number(), z.number()]),
})

export const portSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  system: z.string().min(1),
  direction: z.string().min(1),
})

export const portGroupSchema = z.object({
  deviceId: z.string().min(1),
  ports: z.array(portSchema),
})

export const pipeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  system: z.string().min(1),
  routeType: z.string().min(1),
  level: z.string().min(1),
})

export const sceneFileSchema = z.object({
  version: z.number().int().positive(),
  devices: z.array(deviceSchema),
  portGroups: z.array(portGroupSchema),
  pipes: z.array(pipeSchema),
})

export const catalogSchema = z.object({
  assets: z.array(z.string().min(1)),
})

export const assetJsonSchema = z.object({
  assetVersion: z.number().int().positive(),
  assetId: z.string().min(1),
  displayName: z.string().min(1),
  type: z.string().min(1),
  defaultSystem: z.string().min(1),
  bounds: z.object({
    halfExtents: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]),
  }),
  renderStyle: z.enum(['box', 'icosahedron', 'dodecahedron', 'octahedron']).optional(),
  modelGlb: z.boolean().optional(),
})

export const portsFileSchema = z.object({
  ports: z.array(portSchema),
})

export type SceneFile = z.infer<typeof sceneFileSchema>
