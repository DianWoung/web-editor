import { z } from 'zod'
import type { PortDef } from '@/schemas/port'

const catalogSchema = z.object({
  assets: z.array(z.string().min(1)),
})

const assetJsonSchema = z.object({
  assetVersion: z.number().int().positive(),
  assetId: z.string().min(1),
  displayName: z.string().min(1),
  type: z.string().min(1),
  defaultSystem: z.string().min(1),
  bounds: z.object({
    halfExtents: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]),
  }),
  /** 为 true 时尝试加载 `/equipment/{assetId}/model.glb` */
  modelGlb: z.boolean().optional(),
})

const portsFileSchema = z.object({
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

export type CatalogAsset = {
  assetVersion: number
  assetId: string
  displayName: string
  type: string
  defaultSystem: string
  halfExtents: [number, number, number]
  modelGlb: boolean
  portsTemplate: PortDef[]
}

export async function loadEquipmentCatalog(): Promise<CatalogAsset[]> {
  const catRes = await fetch('/equipment/catalog.json')
  if (!catRes.ok) throw new Error(`加载 catalog 失败: ${catRes.status}`)
  const catJson: unknown = await catRes.json()
  const cat = catalogSchema.parse(catJson)

  const out: CatalogAsset[] = []
  for (const assetId of cat.assets) {
    const [aRes, pRes] = await Promise.all([
      fetch(`/equipment/${assetId}/asset.json`),
      fetch(`/equipment/${assetId}/ports.json`),
    ])
    if (!aRes.ok) throw new Error(`加载 asset 失败 ${assetId}: ${aRes.status}`)
    if (!pRes.ok) throw new Error(`加载 ports 失败 ${assetId}: ${pRes.status}`)
    const aJson: unknown = await aRes.json()
    const pJson: unknown = await pRes.json()
    const a = assetJsonSchema.parse(aJson)
    const p = portsFileSchema.parse(pJson)
    out.push({
      assetVersion: a.assetVersion,
      assetId: a.assetId,
      displayName: a.displayName,
      type: a.type,
      defaultSystem: a.defaultSystem,
      halfExtents: a.bounds.halfExtents,
      modelGlb: a.modelGlb ?? false,
      portsTemplate: p.ports.map((x) => ({
        id: x.id,
        name: x.name,
        position: x.position,
        system: x.system,
        direction: x.direction,
      })),
    })
  }
  return out
}
