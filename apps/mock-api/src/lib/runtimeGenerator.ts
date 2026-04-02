import type { SceneFile } from '../schemas.ts'
import { runtimeDeviceSchema, runtimeOverviewSchema } from '../schemas.ts'

type SceneDevice = SceneFile['devices'][number]

const GENERATED_BASE_TIME_MS = Date.UTC(2026, 0, 1, 18, 0, 0)

function stableHash(value: string) {
  return [...value].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0)
}

function roundTo(value: number, digits: number) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function getDeviceHashes(device: SceneDevice) {
  const idHash = stableHash(device.id)
  const metaHash = stableHash(`${device.system}|${device.name}`)
  return { idHash, metaHash }
}

function getGeneratedUpdatedAt(device: SceneDevice) {
  const { idHash, metaHash } = getDeviceHashes(device)
  const offsetSeconds = 3296 + (idHash % 10) * 20 - (metaHash % 150) * 4
  return new Date(GENERATED_BASE_TIME_MS + offsetSeconds * 1000).toISOString()
}

function getGeneratedStatus(device: SceneDevice) {
  const { idHash } = getDeviceHashes(device)
  const statusCode = idHash % 5
  if (statusCode === 2) {
    return 'degraded' as const
  }
  if (statusCode === 3) {
    return 'offline' as const
  }
  return 'online' as const
}

export function generateRuntimeDevice(device: SceneDevice) {
  const { idHash, metaHash } = getDeviceHashes(device)
  const updatedAt = getGeneratedUpdatedAt(device)
  const onlineStatus = getGeneratedStatus(device)
  const isChiller = device.type === 'chiller'
  const power = roundTo(31.85 + (idHash % 50) / 20 + (metaHash % 150) / 25, 1)
  const flow = roundTo(49.66 + (idHash % 60) / 5 + (metaHash % 30) / 5, 1)
  const cop = roundTo(3.99 + (idHash % 10) / 200 - (metaHash % 100) / 250, 2)
  const pointQuality = onlineStatus === 'degraded' ? 'bad' : onlineStatus === 'offline' ? 'stale' : 'good'

  const alarms =
    onlineStatus === 'online'
      ? []
      : onlineStatus === 'degraded'
        ? [
            {
              id: `${device.id}-PERFORMANCE`,
              level: 'warning' as const,
              message: 'Performance is outside the expected band',
              time: updatedAt,
            },
          ]
        : [
            {
              id: `${device.id}-OFFLINE`,
              level: 'critical' as const,
              message: 'Device is offline',
              time: updatedAt,
            },
          ]

  return runtimeDeviceSchema.parse({
    deviceId: device.id,
    deviceName: device.name,
    system: device.system,
    onlineStatus,
    updatedAt,
    points: [
      { id: 'power', name: 'Power', value: power, unit: 'kW', quality: pointQuality },
      { id: 'flow', name: 'Flow', value: flow, unit: 'm3/h', quality: pointQuality },
      ...(isChiller ? [{ id: 'cop', name: 'COP', value: cop, unit: '', quality: 'good' as const }] : []),
    ],
    alarms,
    trend: [
      { t: new Date(Date.parse(updatedAt) - 5 * 60 * 1000).toISOString(), v: roundTo(power - 0.6 + (idHash % 2) * 0.4, 1) },
      { t: updatedAt, v: power },
    ],
  })
}

export function generateRuntimeOverview(devices: SceneDevice[]) {
  const generatedDevices = devices.map(generateRuntimeDevice)
  const totalPower = roundTo(
    generatedDevices.reduce((sum, device) => sum + (device.points.find((point) => point.id === 'power')?.value ?? 0), 0),
    1,
  )
  const copPoints = generatedDevices.flatMap((device) =>
    device.points.filter((point) => point.id === 'cop').map((point) => point.value),
  )
  const avgCop = copPoints.length === 0 ? 0 : roundTo(copPoints.reduce((sum, value) => sum + value, 0) / copPoints.length, 2)
  const activeAlarmCount = generatedDevices.reduce((sum, device) => sum + device.alarms.length, 0)
  const lastUpdatedAt =
    generatedDevices.length === 0
      ? null
      : generatedDevices.reduce((latest, device) => (device.updatedAt > latest ? device.updatedAt : latest), generatedDevices[0].updatedAt)

  return runtimeOverviewSchema.parse({
    totalPower,
    avgCop,
    activeAlarmCount,
    lastUpdatedAt,
  })
}
