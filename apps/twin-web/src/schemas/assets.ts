import { z } from 'zod'

export const assetStatusSchema = z.enum(['draft', 'published', 'archived'])
export const renderStyleSchema = z.enum(['box', 'icosahedron', 'dodecahedron', 'octahedron'])

export const assetBoundsSchema = z.object({
  halfExtents: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]),
})

export const assetListItemSchema = z.object({
  id: z.string().min(1),
  assetKey: z.string().min(1),
  displayName: z.string().min(1),
  type: z.string().min(1),
  defaultSystem: z.string().min(1),
  assetVersion: z.number().int().positive(),
  renderStyle: renderStyleSchema,
  bounds: assetBoundsSchema,
  modelUrl: z.string().min(1).nullable(),
  status: assetStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const assetPortSchema = z.object({
  id: z.string().min(1),
  portKey: z.string().min(1),
  name: z.string().min(1),
  position: z.tuple([z.number(), z.number(), z.number()]),
  system: z.string().min(1),
  direction: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
})

export const assetConnectorSchema = z.object({
  id: z.string().min(1),
  connectorKey: z.string().min(1),
  portKey: z.string().min(1),
  name: z.string().min(1),
  system: z.string().min(1),
  role: z.string().min(1),
  medium: z.string().min(1).nullable(),
  direction: z.string().min(1),
  side: z.string().min(1).nullable(),
  groupKey: z.string().min(1).nullable(),
  required: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  geometry: z.object({
    anchor: z.tuple([z.number(), z.number(), z.number()]),
    normal: z.tuple([z.number(), z.number(), z.number()]).nullable().optional(),
  }),
})

export const assetBindingSchema = z.object({
  id: z.string().min(1),
  bindingType: z.enum(['device_identity', 'point_mapping', 'runtime_field']),
  bindingKey: z.string().min(1),
  bindingValue: z.string(),
  note: z.string(),
})

export const assetDetailSchema = z.object({
  asset: assetListItemSchema,
  connectors: z.array(assetConnectorSchema),
  ports: z.array(assetPortSchema),
  bindings: z.array(assetBindingSchema),
})

export const assetListSchema = z.object({
  items: z.array(assetListItemSchema),
})

export const assetMutationSchema = z.object({
  assetKey: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(80),
  defaultSystem: z.string().trim().min(1).max(80),
  assetVersion: z.number().int().positive(),
  renderStyle: renderStyleSchema,
  bounds: assetBoundsSchema,
  modelUploadId: z.string().trim().min(1).nullable().optional(),
})

export const assetPortMutationSchema = z.object({
  portKey: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  position: z.tuple([z.number(), z.number(), z.number()]),
  system: z.string().trim().min(1).max(80),
  direction: z.string().trim().min(1).max(40),
  role: z.string().trim().min(1).max(80).default('generic'),
  medium: z.string().trim().min(1).max(80).nullable().optional(),
  side: z.string().trim().min(1).max(40).nullable().optional(),
  groupKey: z.string().trim().min(1).max(80).nullable().optional(),
  required: z.boolean().optional().default(false),
  normal: z.tuple([z.number(), z.number(), z.number()]).nullable().optional(),
})

export const assetPortsPayloadSchema = z.object({
  ports: z.array(assetPortMutationSchema),
})

export const assetPortsResponseSchema = z.object({
  connectors: z.array(assetConnectorSchema),
  ports: z.array(assetPortSchema),
})

export const assetBindingMutationSchema = z.object({
  bindingType: z.enum(['device_identity', 'point_mapping', 'runtime_field']),
  bindingKey: z.string().trim().min(1).max(120),
  bindingValue: z.string(),
  note: z.string(),
})

export const assetBindingsPayloadSchema = z.object({
  bindings: z.array(assetBindingMutationSchema),
})

export const assetBindingsResponseSchema = z.object({
  bindings: z.array(assetBindingSchema),
})

export const assetUploadSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  storageKey: z.string().min(1),
  publicUrl: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  uploadStatus: z.enum(['uploaded']),
  createdAt: z.string().min(1),
})

export const assetUploadResponseSchema = z.object({
  upload: assetUploadSchema,
})

export const assetVersionSchema = z.object({
  id: z.string().min(1),
  versionNo: z.number().int().positive(),
  publishedAt: z.string().min(1),
  publishedBy: z.string().min(1),
  snapshotJson: z.record(z.string(), z.unknown()),
})

export const assetVersionsSchema = z.object({
  items: z.array(assetVersionSchema),
})

export type AssetBinding = z.infer<typeof assetBindingSchema>
export type AssetConnector = z.infer<typeof assetConnectorSchema>
export type AssetDetail = z.infer<typeof assetDetailSchema>
export type AssetListItem = z.infer<typeof assetListItemSchema>
export type AssetMutationInput = z.infer<typeof assetMutationSchema>
export type AssetPort = z.infer<typeof assetPortSchema>
export type AssetUpload = z.infer<typeof assetUploadSchema>
