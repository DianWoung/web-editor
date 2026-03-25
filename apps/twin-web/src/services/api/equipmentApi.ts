import { z } from 'zod'
import { apiRequest } from '@/services/api/client'
import { assetJsonSchema, catalogSchema, portsFileSchema } from '@/services/equipmentSchemas'

export async function getEquipmentCatalogAssetIds() {
  const data = await apiRequest<unknown>('/equipment/catalog')
  return catalogSchema.parse(data).assets
}

export async function getEquipmentAssetJson(assetId: string) {
  const data = await apiRequest<unknown>(`/equipment/${encodeURIComponent(assetId)}`)
  return assetJsonSchema.parse(data)
}

export async function getEquipmentPortsJson(assetId: string) {
  const data = await apiRequest<unknown>(`/equipment/${encodeURIComponent(assetId)}/ports`)
  return portsFileSchema.parse(data)
}

export const equipmentApiSchemas = {
  catalogSchema,
  assetJsonSchema,
  portsFileSchema,
} satisfies Record<string, z.ZodTypeAny>
