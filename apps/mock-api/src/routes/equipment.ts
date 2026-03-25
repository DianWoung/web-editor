import path from 'node:path'
import { Router } from 'express'

import { readJsonFile } from '../lib/fileStore.ts'
import { assetJsonSchema, catalogSchema, portsFileSchema } from '../schemas.ts'

export function createEquipmentRouter(dataRoot: string) {
  const router = Router()

  router.get('/catalog', async (_req, res, next) => {
    try {
      const filePath = path.join(dataRoot, 'equipment', 'catalog.json')
      res.json(await readJsonFile(filePath, catalogSchema))
    } catch (error) {
      next(error)
    }
  })

  router.get('/:assetId', async (req, res, next) => {
    try {
      const filePath = path.join(dataRoot, 'equipment', req.params.assetId, 'asset.json')
      res.json(await readJsonFile(filePath, assetJsonSchema))
    } catch (error) {
      next(error)
    }
  })

  router.get('/:assetId/ports', async (req, res, next) => {
    try {
      const filePath = path.join(dataRoot, 'equipment', req.params.assetId, 'ports.json')
      res.json(await readJsonFile(filePath, portsFileSchema))
    } catch (error) {
      next(error)
    }
  })

  return router
}
