import { z } from 'zod'
import type { PortDef } from '@/schemas/port'
import {
  getEquipmentAssetJson,
  getEquipmentCatalogAssetIds,
  getEquipmentPortsJson,
} from '@/services/api/equipmentApi'
import {
  assetJsonSchema,
  portsFileSchema,
  type RenderStyle,
} from '@/services/equipmentSchemas'

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
  const [asset, ports] = await Promise.all([
    getEquipmentAssetJson(assetId),
    getEquipmentPortsJson(assetId),
  ])
  return mapCatalogAsset(asset, ports)
}

export async function loadEquipmentCatalog(): Promise<CatalogAsset[]> {
  const assetIds = await getEquipmentCatalogAssetIds()
  return Promise.all(assetIds.map((assetId) => loadEquipmentAsset(assetId)))
}

export async function loadEquipmentAssetsByIds(assetIds: string[]): Promise<CatalogAsset[]> {
  const uniq = Array.from(new Set(assetIds))
  return Promise.all(uniq.map((assetId) => loadEquipmentAsset(assetId)))
}

export { assetJsonSchema, catalogSchema, portsFileSchema, type RenderStyle } from '@/services/equipmentSchemas'
