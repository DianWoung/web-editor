import { z } from 'zod'
import type { PortDef } from '@/schemas/port'

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
  /** 占位渲染风格：当 modelGlb=false 时用于生成多面体几何 */
  renderStyle: z.enum(['box', 'icosahedron', 'dodecahedron', 'octahedron']).optional(),
  /** 为 true 时尝试加载 `/equipment/{assetId}/model.glb` */
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

export type CatalogAsset = {
  assetVersion: number
  assetId: string
  displayName: string
  type: string
  defaultSystem: string
  halfExtents: [number, number, number]
  modelGlb: boolean
  /** 当为本地导入资产包时，可能为 blob URL */
  modelGlbUrl?: string | null
  renderStyle?: RenderStyle
  portsTemplate: PortDef[]
}

function mapCatalogAsset(
  asset: z.infer<typeof assetJsonSchema>,
  ports: z.infer<typeof portsFileSchema>,
): CatalogAsset {
  return {
    assetVersion: asset.assetVersion,
    assetId: asset.assetId,
    displayName: asset.displayName,
    type: asset.type,
    defaultSystem: asset.defaultSystem,
    halfExtents: asset.bounds.halfExtents,
    modelGlb: asset.modelGlb ?? false,
    modelGlbUrl: asset.modelGlb ? `/equipment/${asset.assetId}/model.glb` : null,
    renderStyle: asset.renderStyle ?? 'box',
    portsTemplate: ports.ports.map((port) => ({
      id: port.id,
      name: port.name,
      position: port.position,
      system: port.system,
      direction: port.direction,
    })),
  }
}

async function loadEquipmentAsset(assetId: string): Promise<CatalogAsset> {
  const [assetRes, portsRes] = await Promise.all([
    fetch(`/equipment/${assetId}/asset.json`),
    fetch(`/equipment/${assetId}/ports.json`),
  ])
  if (!assetRes.ok) throw new Error(`加载 asset 失败 ${assetId}: ${assetRes.status}`)
  if (!portsRes.ok) throw new Error(`加载 ports 失败 ${assetId}: ${portsRes.status}`)

  const assetJson: unknown = await assetRes.json()
  const portsJson: unknown = await portsRes.json()
  const asset = assetJsonSchema.parse(assetJson)
  const ports = portsFileSchema.parse(portsJson)
  return mapCatalogAsset(asset, ports)
}

export async function loadEquipmentCatalog(): Promise<CatalogAsset[]> {
  const catRes = await fetch('/equipment/catalog.json')
  if (!catRes.ok) throw new Error(`加载 catalog 失败: ${catRes.status}`)
  const catJson: unknown = await catRes.json()
  const cat = catalogSchema.parse(catJson)
  return Promise.all(cat.assets.map((assetId) => loadEquipmentAsset(assetId)))
}

export async function loadEquipmentAssetsByIds(assetIds: string[]): Promise<CatalogAsset[]> {
  const uniq = Array.from(new Set(assetIds))
  return Promise.all(uniq.map((assetId) => loadEquipmentAsset(assetId)))
}
