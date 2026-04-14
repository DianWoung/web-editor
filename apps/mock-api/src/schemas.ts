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

export const sceneLibraryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  remark: z.string().default(''),
  updatedAt: z.string().min(1),
  deviceCount: z.number().int().nonnegative(),
  pipeCount: z.number().int().nonnegative(),
})

export const sceneLibraryIndexSchema = z.object({
  items: z.array(sceneLibraryItemSchema),
})

export const currentSceneMetaSchema = z.object({
  sceneId: z.string().min(1).nullable(),
})

export const saveNamedSceneRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  remark: z.string().trim().max(240).default(''),
  scene: sceneFileSchema,
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
  modelUrl: z.string().min(1).nullable().optional(),
})

export const portsFileSchema = z.object({
  ports: z.array(portSchema),
})

export const assetStatusSchema = z.enum(['draft', 'published', 'archived'])

export const renderStyleSchema = z.enum(['box', 'icosahedron', 'dodecahedron', 'octahedron'])

export const assetBoundsSchema = z.object({
  halfExtents: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]),
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

export const assetDetailSchema = z.object({
  asset: assetListItemSchema,
  connectors: z.array(
    z.object({
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
    }),
  ),
  ports: z.array(
    z.object({
      id: z.string().min(1),
      portKey: z.string().min(1),
      name: z.string().min(1),
      position: z.tuple([z.number(), z.number(), z.number()]),
      system: z.string().min(1),
      direction: z.string().min(1),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
  bindings: z.array(
    z.object({
      id: z.string().min(1),
      bindingType: z.enum(['device_identity', 'point_mapping', 'runtime_field']),
      bindingKey: z.string().min(1),
      bindingValue: z.string(),
      note: z.string(),
    }),
  ),
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

export const assetBindingMutationSchema = z.object({
  bindingType: z.enum(['device_identity', 'point_mapping', 'runtime_field']),
  bindingKey: z.string().trim().min(1).max(120),
  bindingValue: z.string(),
  note: z.string().default(''),
})

export const assetBindingsPayloadSchema = z.object({
  bindings: z.array(assetBindingMutationSchema),
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

export const assetVersionSchema = z.object({
  id: z.string().min(1),
  versionNo: z.number().int().positive(),
  publishedAt: z.string().min(1),
  publishedBy: z.string().min(1),
  snapshotJson: z.record(z.string(), z.unknown()),
})

export const runtimeOverviewSchema = z.object({
  totalPower: z.number(),
  avgCop: z.number(),
  activeAlarmCount: z.number().int(),
  lastUpdatedAt: z.string().min(1).nullable(),
})

export const runtimePointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  quality: z.enum(['good', 'bad', 'stale']),
})

export const runtimeAlarmSchema = z.object({
  id: z.string().min(1),
  level: z.enum(['warning', 'critical']),
  message: z.string().min(1),
  time: z.string().min(1),
})

export const runtimeTrendPointSchema = z.object({
  t: z.string().min(1),
  v: z.number(),
})

export const runtimeDeviceSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  system: z.string().min(1),
  onlineStatus: z.enum(['online', 'offline', 'degraded']),
  updatedAt: z.string().min(1),
  points: z.array(runtimePointSchema),
  alarms: z.array(runtimeAlarmSchema),
  trend: z.array(runtimeTrendPointSchema),
})

export const runtimeSnapshotSchema = z.object({
  overview: runtimeOverviewSchema.optional(),
  devices: z.record(z.string().min(1), runtimeDeviceSchema).default({}),
})

export type SceneFile = z.infer<typeof sceneFileSchema>
export type SceneLibraryItem = z.infer<typeof sceneLibraryItemSchema>
export type AssetDetail = z.infer<typeof assetDetailSchema>
export type AssetListItem = z.infer<typeof assetListItemSchema>
export type AssetUpload = z.infer<typeof assetUploadSchema>
export type AssetVersion = z.infer<typeof assetVersionSchema>
export type RuntimeDevice = z.infer<typeof runtimeDeviceSchema>
export type RuntimeOverview = z.infer<typeof runtimeOverviewSchema>
export type RuntimeSnapshot = z.infer<typeof runtimeSnapshotSchema>
