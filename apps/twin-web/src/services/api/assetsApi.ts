import { apiRequest } from '@/services/api/client'
import {
  assetBindingsResponseSchema,
  assetDetailSchema,
  assetListSchema,
  assetMutationSchema,
  assetPortsResponseSchema,
  assetUploadResponseSchema,
  assetVersionsSchema,
  type AssetMutationInput,
} from '@/schemas/assets'

export async function listAssets(status: 'draft' | 'published' | 'archived' | 'all' = 'all') {
  const query = status === 'all' ? '' : `?status=${encodeURIComponent(status)}`
  return assetListSchema.parse(await apiRequest<unknown>(`/assets${query}`))
}

export async function createAssetDraft(input: AssetMutationInput) {
  return assetDetailSchema.parse(
    await apiRequest<unknown>('/assets', { method: 'POST', body: JSON.stringify(assetMutationSchema.parse(input)) }),
  )
}

export async function getAssetDetail(assetId: string) {
  return assetDetailSchema.parse(await apiRequest<unknown>(`/assets/${encodeURIComponent(assetId)}`))
}

export async function updateAsset(assetId: string, input: AssetMutationInput) {
  return assetDetailSchema.parse(
    await apiRequest<unknown>(`/assets/${encodeURIComponent(assetId)}`, {
      method: 'PUT',
      body: JSON.stringify(assetMutationSchema.parse(input)),
    }),
  )
}

export async function replaceAssetPorts(
  assetId: string,
  ports: Array<{
    portKey: string
    name: string
    position: [number, number, number]
    system: string
    direction: string
    role?: string
    medium?: string | null
    side?: string | null
    groupKey?: string | null
    required?: boolean
    normal?: [number, number, number] | null
  }>,
) {
  return assetPortsResponseSchema.parse(
    await apiRequest<unknown>(`/assets/${encodeURIComponent(assetId)}/ports`, {
      method: 'PUT',
      body: JSON.stringify({ ports }),
    }),
  )
}

export async function replaceAssetBindings(
  assetId: string,
  bindings: Array<{
    bindingType: 'device_identity' | 'point_mapping' | 'runtime_field'
    bindingKey: string
    bindingValue: string
    note: string
  }>,
) {
  return assetBindingsResponseSchema.parse(
    await apiRequest<unknown>(`/assets/${encodeURIComponent(assetId)}/bindings`, {
      method: 'PUT',
      body: JSON.stringify({ bindings }),
    }),
  )
}

export async function uploadAssetModel(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return assetUploadResponseSchema.parse(
    await apiRequest<unknown>('/assets/uploads', {
      method: 'POST',
      body: formData,
    }),
  )
}

export async function publishAsset(assetId: string) {
  return assetDetailSchema.parse(
    await apiRequest<unknown>(`/assets/${encodeURIComponent(assetId)}/publish`, { method: 'POST' }),
  )
}

export async function archiveAsset(assetId: string) {
  return assetDetailSchema.parse(
    await apiRequest<unknown>(`/assets/${encodeURIComponent(assetId)}/archive`, { method: 'POST' }),
  )
}

export async function deleteAsset(assetId: string) {
  return apiRequest<{ ok: boolean }>(`/assets/${encodeURIComponent(assetId)}`, { method: 'DELETE' })
}

export async function listAssetVersions(assetId: string) {
  return assetVersionsSchema.parse(await apiRequest<unknown>(`/assets/${encodeURIComponent(assetId)}/versions`))
}
