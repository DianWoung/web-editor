import assert from 'node:assert/strict'
import { describe, it } from 'vitest'

import type { SceneFile } from '@/schemas/scene'

import { getSceneViewFrame } from './sceneViewFrame'

function sceneWithSingleDevice(): SceneFile {
  return {
    version: 1,
    devices: [
      {
        id: 'CH-7f8c134e',
        type: 'chiller',
        name: '风冷主机',
        assetId: 'large_air_cooled_chiller_iot_v1',
        position: [0, 2.1, 0],
        rotation: [0, 0, 0],
        system: 'heating',
        tags: [],
        boundsHalfExtents: [8.8, 2.1, 2.3],
      },
    ],
    portGroups: [],
    pipes: [],
  }
}

describe('getSceneViewFrame', () => {
  it('frames the actual device volume instead of the ground origin', () => {
    const frame = getSceneViewFrame(sceneWithSingleDevice())

    assert.deepEqual(frame.target.map((value) => Number(value.toFixed(1))), [0, 0.9, 0])
    assert.equal(frame.position[0] > 10, true)
    assert.equal(frame.position[1] > 12, true)
    assert.equal(frame.position[2] > 10, true)
    assert.equal(frame.distance > 10, true)
  })

  it('falls back to a stable default frame for empty scenes', () => {
    const frame = getSceneViewFrame({ version: 1, devices: [], portGroups: [], pipes: [] })

    assert.deepEqual(frame.target, [0, 1.6, 0])
    assert.deepEqual(frame.position, [12, 8, 12])
  })
})
