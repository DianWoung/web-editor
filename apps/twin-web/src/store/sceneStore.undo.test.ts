import assert from 'node:assert/strict'
import { beforeEach, test } from 'vitest'

import type { SceneFile } from '@/schemas/scene'
import { useEditorUiStore } from './editorUiStore.ts'
import { useSceneStore } from './sceneStore.ts'

const asset = {
  assetVersion: 1,
  assetId: 'large_air_cooled_chiller_iot_v1',
  displayName: '大型风冷冷水机组',
  type: 'chiller',
  defaultSystem: 'CHW',
  halfExtents: [1, 1, 1] as [number, number, number],
  modelGlb: false,
  modelGlbUrl: null,
  renderStyle: 'box' as const,
  portsTemplate: [],
}

const sampleScene: SceneFile = {
  version: 1,
  devices: [
    {
      id: 'CH-01',
      type: 'chiller',
      name: '主机 1',
      assetId: 'large_air_cooled_chiller_iot_v1',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      system: 'CHW',
      tags: [],
      boundsHalfExtents: [1, 1, 1],
    },
  ],
  portGroups: [{ deviceId: 'CH-01', ports: [] }],
  pipes: [],
}

beforeEach(() => {
  useSceneStore.getState().clearScene()
  useEditorUiStore.getState().reset()
})

test('undo restores the previous scene after adding a device', () => {
  useSceneStore.getState().addDeviceFromAsset(asset)

  assert.equal(useSceneStore.getState().devices.length, 1)
  assert.equal(useSceneStore.getState().canUndo, true)

  useSceneStore.getState().undo()

  assert.equal(useSceneStore.getState().devices.length, 0)
  assert.equal(useSceneStore.getState().canUndo, false)
})

test('undo restores cleared scene content', () => {
  useSceneStore.getState().loadScene(sampleScene)
  useSceneStore.getState().clearScene()

  assert.equal(useSceneStore.getState().devices.length, 0)

  useSceneStore.getState().undo()

  assert.equal(useSceneStore.getState().devices.length, 1)
  assert.equal(useSceneStore.getState().devices[0]?.id, 'CH-01')
})

test('undo restores the previous scene after loading a new scene', () => {
  useSceneStore.getState().loadScene(sampleScene)
  useSceneStore.getState().loadScene({ version: 1, devices: [], portGroups: [], pipes: [] })

  assert.equal(useSceneStore.getState().devices.length, 0)

  useSceneStore.getState().undo()

  assert.equal(useSceneStore.getState().devices.length, 1)
  assert.equal(useSceneStore.getState().devices[0]?.id, 'CH-01')
})

test('replaceScene resets undo history for page-entry loads', () => {
  useSceneStore.getState().loadScene(sampleScene)
  useSceneStore.getState().replaceScene({ version: 1, devices: [], portGroups: [], pipes: [] })

  assert.equal(useSceneStore.getState().devices.length, 0)
  assert.equal(useSceneStore.getState().canUndo, false)
})
