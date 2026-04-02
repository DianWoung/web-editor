import path from 'node:path'
import { Router } from 'express'

import { readJsonFile } from '../lib/fileStore.ts'
import { HttpError } from '../lib/httpErrors.ts'
import { runtimeDeviceSchema, runtimeOverviewSchema, sceneFileSchema } from '../schemas.ts'

function buildRuntimeDevice(device: { id: string; name: string; system: string }) {
  const now = new Date().toISOString()
  return runtimeDeviceSchema.parse({
    deviceId: device.id,
    deviceName: device.name,
    system: device.system,
    onlineStatus: 'online',
    updatedAt: now,
    points: [
      { id: 'power', name: 'Power', value: 18.4, unit: 'kW', quality: 'good' },
      { id: 'flow', name: 'Flow', value: 42.8, unit: 'm3/h', quality: 'good' },
    ],
    alarms: [
      {
        id: `${device.id}-LOW-FLOW`,
        level: 'warning',
        message: 'Flow is below target',
        time: now,
      },
    ],
    trend: [
      { t: new Date(Date.now() - 300000).toISOString(), v: 17.9 },
      { t: now, v: 18.4 },
    ],
  })
}

export function createRuntimeRouter(dataRoot: string) {
  const router = Router()
  const currentScenePath = path.join(dataRoot, 'scene', 'current.scene.json')

  router.get('/overview', (_req, res) => {
    res.json(
      runtimeOverviewSchema.parse({
        totalPower: 1248.6,
        avgCop: 4.12,
        activeAlarmCount: 1,
        lastUpdatedAt: new Date().toISOString(),
      }),
    )
  })

  router.get('/devices/:deviceId', async (req, res, next) => {
    try {
      const scene = await readJsonFile(currentScenePath, sceneFileSchema)
      const sceneDevice = scene.devices.find((device) => device.id === req.params.deviceId)
      const device = sceneDevice ? buildRuntimeDevice(sceneDevice) : null
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
