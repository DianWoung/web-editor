import { Router } from 'express'

import type { AssetStore } from '../lib/assetStore.ts'

export function createEquipmentRouter(assetStore: AssetStore) {
  const router = Router()

  router.get('/catalog', async (_req, res, next) => {
    try {
      res.json({ assets: assetStore.listPublishedAssetKeys() })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:assetId', async (req, res, next) => {
    try {
      res.json(assetStore.getPublishedAssetJson(req.params.assetId))
    } catch (error) {
      next(error)
    }
  })

  router.get('/:assetId/ports', async (req, res, next) => {
    try {
      res.json(assetStore.getPublishedPortsJson(req.params.assetId))
    } catch (error) {
      next(error)
    }
  })

  return router
}
