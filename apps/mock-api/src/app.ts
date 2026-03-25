import express from 'express'

import { getErrorMessage, HttpError } from './lib/httpErrors.ts'
import { createEquipmentRouter } from './routes/equipment.ts'
import { healthRouter } from './routes/health.ts'
import { createSceneRouter } from './routes/scene.ts'

export type MockApiAppOptions = {
  dataRoot: string
}

export function createApp(_options: MockApiAppOptions) {
  const { dataRoot } = _options
  const app = express()
  app.use(express.json())
  app.use('/api/health', healthRouter)
  app.use('/api/scene', createSceneRouter(dataRoot))
  app.use('/api/equipment', createEquipmentRouter(dataRoot))
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
