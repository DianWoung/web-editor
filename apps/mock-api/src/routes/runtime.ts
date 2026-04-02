import { Router } from 'express'

import { HttpError } from '../lib/httpErrors.ts'
import { getRuntimeDevice, getRuntimeOverview } from '../lib/runtimeService.ts'

export function createRuntimeRouter(dataRoot: string) {
  const router = Router()

  router.get('/overview', async (_req, res, next) => {
    try {
      res.json(await getRuntimeOverview(dataRoot))
    } catch (error) {
      next(error)
    }
  })

  router.get('/devices/:deviceId', async (req, res, next) => {
    try {
      const device = await getRuntimeDevice(dataRoot, req.params.deviceId)
      if (!device) {
        throw new HttpError(404, 'Not Found')
      }

      res.json(device)
    } catch (error) {
      next(error)
    }
  })

  return router
}
