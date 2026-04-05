import assert from 'node:assert/strict'
import { beforeEach, test } from 'vitest'

import { useSceneStore } from './sceneStore.ts'
import { useEditorUiStore } from './editorUiStore.ts'

const scene = {
  version: 1,
  devices: [],
  portGroups: [],
  pipes: [],
} as const

beforeEach(() => {
  useSceneStore.getState().clearScene()
  useEditorUiStore.getState().reset()
})

test('editor ui state is isolated from scene data and resets around scene loads', () => {
  useEditorUiStore.getState().setWireFrom({ deviceId: 'CH-01', portId: 'out' })
  useEditorUiStore.getState().setError('bad route')

  useSceneStore.getState().loadScene(scene)

  const sceneState = useSceneStore.getState() as Record<string, unknown>
  assert.equal('editorUi' in sceneState, false)
  assert.deepEqual(useEditorUiStore.getState().wireFrom, null)
  assert.equal(useEditorUiStore.getState().lastError, null)

  useEditorUiStore.getState().setFlowEnabled(true)
  useSceneStore.getState().clearScene()

  assert.equal(useEditorUiStore.getState().flowEnabled, false)
  assert.equal(useSceneStore.getState().devices.length, 0)
})
