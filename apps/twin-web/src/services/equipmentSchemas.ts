import { z } from 'zod'

export const catalogSchema = z.object({
  assets: z.array(z.string().min(1)),
})

export type RenderStyle = 'box' | 'icosahedron' | 'dodecahedron' | 'octahedron'

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
  ports: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      position: z.tuple([z.number(), z.number(), z.number()]),
      system: z.string().min(1),
      direction: z.string().min(1),
    }),
  ),
})
