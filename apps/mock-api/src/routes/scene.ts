import path from 'node:path'
import { Router } from 'express'

import { fileExists, readJsonFile, writeJsonFile } from '../lib/fileStore.ts'
import { HttpError } from '../lib/httpErrors.ts'
import {
  currentSceneMetaSchema,
  saveNamedSceneRequestSchema,
  sceneFileSchema,
  sceneLibraryIndexSchema,
  type SceneFile,
  type SceneLibraryItem,
} from '../schemas.ts'

type CurrentSceneMeta = {
  sceneId: string | null
}

function slugifySceneName(name: string) {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'scene'
}

export function createSceneRouter(dataRoot: string) {
  const router = Router()

  const currentScenePath = path.join(dataRoot, 'scene', 'current.scene.json')
  const demoScenePath = path.join(dataRoot, 'scene', 'demo.scene.json')
  const currentSceneMetaPath = path.join(dataRoot, 'scene', 'current.scene.meta.json')
  const sceneLibraryIndexPath = path.join(dataRoot, 'scene', 'library', 'index.json')
  const sceneLibraryDir = path.join(dataRoot, 'scene', 'library', 'files')

  async function readSceneLibraryIndex() {
    if (!(await fileExists(sceneLibraryIndexPath))) {
      return { items: [] as SceneLibraryItem[] }
    }
    return readJsonFile(sceneLibraryIndexPath, sceneLibraryIndexSchema)
  }

  async function readCurrentSceneMeta(): Promise<CurrentSceneMeta> {
    if (!(await fileExists(currentSceneMetaPath))) {
      return { sceneId: null }
    }
    return readJsonFile(currentSceneMetaPath, currentSceneMetaSchema)
  }

  async function writeCurrentSceneMeta(meta: CurrentSceneMeta) {
    await writeJsonFile(currentSceneMetaPath, meta)
  }

  async function readNamedScene(sceneId: string): Promise<SceneFile> {
    return readJsonFile(path.join(sceneLibraryDir, `${sceneId}.scene.json`), sceneFileSchema)
  }

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

  router.get('/library', async (_req, res, next) => {
    try {
      const [library, currentMeta] = await Promise.all([readSceneLibraryIndex(), readCurrentSceneMeta()])
      res.json({
        items: library.items
          .slice()
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map((item) => ({ ...item, isCurrent: item.id === currentMeta.sceneId })),
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/library', async (req, res, next) => {
    const parsed = saveNamedSceneRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `命名场景校验失败：${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`))
      return
    }

    try {
      const { name, scene } = parsed.data
      const library = await readSceneLibraryIndex()
      const existing = library.items.find((item) => item.name === name)
      const sceneId = existing?.id ?? `${slugifySceneName(name)}-${Date.now().toString(36)}`
      const updatedAt = new Date().toISOString()
      const nextItem: SceneLibraryItem = {
        id: sceneId,
        name,
        updatedAt,
        deviceCount: scene.devices.length,
        pipeCount: scene.pipes.length,
      }
      const nextItems = library.items.filter((item) => item.id !== sceneId)
      nextItems.push(nextItem)

      await Promise.all([
        writeJsonFile(path.join(sceneLibraryDir, `${sceneId}.scene.json`), scene),
        writeJsonFile(sceneLibraryIndexPath, { items: nextItems }),
      ])

      res.json({ ok: true, sceneId, name, updatedAt })
    } catch (error) {
      next(error)
    }
  })

  router.put('/library/:sceneId', async (req, res, next) => {
    const parsed = sceneFileSchema.safeParse(req.body)
    if (!parsed.success) {
      next(new HttpError(400, `场景校验失败：${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}`))
      return
    }

    try {
      const { sceneId } = req.params
      const library = await readSceneLibraryIndex()
      const existing = library.items.find((item) => item.id === sceneId)
      if (!existing) {
        throw new HttpError(404, `命名场景不存在：${sceneId}`)
      }

      const updatedAt = new Date().toISOString()
      const nextItem: SceneLibraryItem = {
        id: sceneId,
        name: existing.name,
        updatedAt,
        deviceCount: parsed.data.devices.length,
        pipeCount: parsed.data.pipes.length,
      }
      const nextItems = library.items.filter((item) => item.id !== sceneId)
      nextItems.push(nextItem)

      await Promise.all([
        writeJsonFile(path.join(sceneLibraryDir, `${sceneId}.scene.json`), parsed.data),
        writeJsonFile(sceneLibraryIndexPath, { items: nextItems }),
        writeJsonFile(currentScenePath, parsed.data),
        writeCurrentSceneMeta({ sceneId }),
      ])

      res.json({ ok: true, sceneId, name: existing.name, updatedAt })
    } catch (error) {
      next(error)
    }
  })

  router.get('/library/:sceneId', async (req, res, next) => {
    try {
      res.json(await readNamedScene(req.params.sceneId))
    } catch (error) {
      next(error)
    }
  })

  router.post('/library/:sceneId/load', async (req, res, next) => {
    try {
      const { sceneId } = req.params
      const library = await readSceneLibraryIndex()
      if (!library.items.some((item) => item.id === sceneId)) {
        throw new HttpError(404, `命名场景不存在：${sceneId}`)
      }
      const scene = await readNamedScene(sceneId)
      await Promise.all([writeJsonFile(currentScenePath, scene), writeCurrentSceneMeta({ sceneId })])
      res.json(scene)
    } catch (error) {
      next(error)
    }
  })

  router.post('/reset-demo', async (_req, res, next) => {
    try {
      const scene = await readJsonFile(demoScenePath, sceneFileSchema)
      await Promise.all([writeJsonFile(currentScenePath, scene), writeCurrentSceneMeta({ sceneId: null })])
      res.json(scene)
    } catch (error) {
      next(error)
    }
  })

  return router
}
