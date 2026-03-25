import path from 'node:path'
import { Router } from 'express'

import { readJsonFile, writeJsonFile } from '../lib/fileStore.ts'
import { HttpError } from '../lib/httpErrors.ts'
import { sceneFileSchema } from '../schemas.ts'

export function createSceneRouter(dataRoot: string) {
  const router = Router()

  const currentScenePath = path.join(dataRoot, 'scene', 'current.scene.json')
  const demoScenePath = path.join(dataRoot, 'scene', 'demo.scene.json')

  router.get('/', async (_req, res, next) => {
    try {
      res.json(await readJsonFile(currentScenePath, sceneFileSchema))
    } catch (error) {
      next(error)
    }
  })

  router.put('/', async (req, res, next) => {
    const parsed = sceneFileSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `场景校验失败：${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`))
      return
    }

    try {
      await writeJsonFile(currentScenePath, parsed.data)
      res.json({ ok: true, updatedAt: new Date().toISOString() })
    } catch (error) {
      next(error)
    }
  })

  router.post('/reset-demo', async (_req, res, next) => {
    try {
      const scene = await readJsonFile(demoScenePath, sceneFileSchema)
      await writeJsonFile(currentScenePath, scene)
      res.json(scene)
    } catch (error) {
      next(error)
    }
  })

  return router
}
