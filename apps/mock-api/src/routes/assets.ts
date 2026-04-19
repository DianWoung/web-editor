import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import type { ZodError } from 'zod'

import type { AssetStore } from '../lib/assetStore.ts'
import { HttpError } from '../lib/httpErrors.ts'
import { resolveLegacyModelPath } from '../lib/legacyModelPath.ts'
import { createStorageAdapter } from '../lib/storageAdapter.ts'
import {
  applyTopologyTemplatePayloadSchema,
  assetBindingsPayloadSchema,
  assetMutationSchema,
  assetPortsPayloadSchema,
  assetStatusSchema,
  topologyTemplateMutationSchema,
} from '../schemas.ts'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')
}

export function createAssetsRouter(dataRoot: string, assetStore: AssetStore) {
  const router = Router()
  const upload = multer({ storage: multer.memoryStorage() })
  const storageAdapter = createStorageAdapter(dataRoot)

  router.get('/', (req, res, next) => {
    try {
      const statusParam = req.query.status
      if (typeof statusParam === 'string' && !['draft', 'published', 'archived', 'all'].includes(statusParam)) {
        throw new HttpError(400, `资产状态筛选非法：${statusParam}`)
      }
      const status =
        typeof statusParam === 'string' && ['draft', 'published', 'archived', 'all'].includes(statusParam)
          ? (statusParam as 'draft' | 'published' | 'archived' | 'all')
          : 'all'
      res.json(assetStore.listAssets(status))
    } catch (error) {
      next(error)
    }
  })

  router.post('/', (req, res, next) => {
    const parsed = assetMutationSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `资产校验失败：${formatZodError(parsed.error)}`))
      return
    }

    try {
      res.status(201).json(assetStore.createAssetDraft(parsed.data))
    } catch (error) {
      next(error)
    }
  })

  router.post('/uploads', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        throw new HttpError(400, '缺少模型文件')
      }
      const stored = await storageAdapter.saveModelUpload(req.file)
      res.status(201).json(assetStore.saveUpload({ ...stored, uploadStatus: 'uploaded' }))
    } catch (error) {
      next(error)
    }
  })

  router.get('/uploads/:uploadId/:fileName', async (req, res, next) => {
    try {
      const uploadMeta = assetStore.getUpload(req.params.uploadId)
      const file = await storageAdapter.readUpload(req.params.uploadId, req.params.fileName)
      res.type(uploadMeta.mimeType)
      res.send(file.buffer)
    } catch (error) {
      next(error)
    }
  })

  router.get('/models/:assetId', async (req, res, next) => {
    try {
      const modelPath = resolveLegacyModelPath(dataRoot, req.params.assetId)
      if (!modelPath) {
        throw new HttpError(404, `模型文件不存在：${req.params.assetId}`)
      }
      const buffer = await readFile(modelPath)
      res.type('model/gltf-binary')
      res.send(buffer)
    } catch (error) {
      next(error)
    }
  })

  router.get('/topology-templates', (req, res, next) => {
    try {
      res.json(assetStore.listTopologyTemplates())
    } catch (error) {
      next(error)
    }
  })

  router.get('/topology-templates/:templateId', (req, res, next) => {
    try {
      res.json(assetStore.getTopologyTemplate(req.params.templateId))
    } catch (error) {
      next(error)
    }
  })

  router.post('/topology-templates', (req, res, next) => {
    const parsed = topologyTemplateMutationSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `模板校验失败：${formatZodError(parsed.error)}`))
      return
    }

    try {
      res.status(201).json(assetStore.createTopologyTemplate(parsed.data))
    } catch (error) {
      next(error)
    }
  })

  router.put('/topology-templates/:templateId', (req, res, next) => {
    const parsed = topologyTemplateMutationSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `模板校验失败：${formatZodError(parsed.error)}`))
      return
    }

    try {
      res.json(assetStore.updateTopologyTemplate(req.params.templateId, parsed.data))
    } catch (error) {
      next(error)
    }
  })

  router.get('/:assetId', (req, res, next) => {
    try {
      res.json(assetStore.getAsset(req.params.assetId))
    } catch (error) {
      next(error)
    }
  })

  router.put('/:assetId', (req, res, next) => {
    const parsed = assetMutationSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `资产校验失败：${formatZodError(parsed.error)}`))
      return
    }

    try {
      res.json(assetStore.updateAsset(req.params.assetId, parsed.data))
    } catch (error) {
      next(error)
    }
  })

  router.post('/:assetId/apply-topology-template', (req, res, next) => {
    const parsed = applyTopologyTemplatePayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `模板套用校验失败：${formatZodError(parsed.error)}`))
      return
    }

    try {
      res.json(assetStore.applyTopologyTemplate(req.params.assetId, parsed.data.templateId))
    } catch (error) {
      next(error)
    }
  })

  router.put('/:assetId/ports', (req, res, next) => {
    const parsed = assetPortsPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `端口配置校验失败：${formatZodError(parsed.error)}`))
      return
    }

    try {
      res.json(assetStore.replaceAssetPorts(req.params.assetId, parsed.data.ports))
    } catch (error) {
      next(error)
    }
  })

  router.put('/:assetId/bindings', (req, res, next) => {
    const parsed = assetBindingsPayloadSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `绑定配置校验失败：${formatZodError(parsed.error)}`))
      return
    }

    try {
      res.json(assetStore.replaceAssetBindings(req.params.assetId, parsed.data.bindings))
    } catch (error) {
      next(error)
    }
  })

  router.post('/:assetId/publish', (req, res, next) => {
    try {
      res.json(assetStore.publishAsset(req.params.assetId))
    } catch (error) {
      next(error)
    }
  })

  router.post('/:assetId/archive', (req, res, next) => {
    try {
      res.json(assetStore.archiveAsset(req.params.assetId))
    } catch (error) {
      next(error)
    }
  })

  router.get('/:assetId/versions', (req, res, next) => {
    try {
      res.json(assetStore.listAssetVersions(req.params.assetId))
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:assetId', (req, res, next) => {
    try {
      res.json(assetStore.deleteAsset(req.params.assetId))
    } catch (error) {
      next(error)
    }
  })

  return router
}
