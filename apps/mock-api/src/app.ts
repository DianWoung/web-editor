import express from 'express'

import { createAssetStore } from './lib/assetStore.ts'
import { getErrorMessage, HttpError } from './lib/httpErrors.ts'
import { createAssetsRouter } from './routes/assets.ts'
import { createEquipmentRouter } from './routes/equipment.ts'
import { healthRouter } from './routes/health.ts'
import { createRuntimeRouter } from './routes/runtime.ts'
import { createSceneRouter } from './routes/scene.ts'

export type MockApiAppOptions = {
  dataRoot: string
}

export function createApp(_options: MockApiAppOptions) {
  const { dataRoot } = _options
  const app = express()
  const assetStore = createAssetStore(dataRoot)
  app.use(express.json())
  app.use('/api/health', healthRouter)
  app.use('/api/scene', createSceneRouter(dataRoot))
  app.use('/api/assets', createAssetsRouter(dataRoot, assetStore))
  app.use('/api/equipment', createEquipmentRouter(assetStore))
  app.use('/api/runtime', createRuntimeRouter(dataRoot))
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'Not Found' })
  })
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error instanceof HttpError ? error.status : 500
    res.status(status).json({
      ok: false,
      error: getErrorMessage(error),
    })
  })
  return app
}
