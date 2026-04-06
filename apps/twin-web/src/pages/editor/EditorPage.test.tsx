import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { EditorPage } from './EditorPage'

const editorPageMocks = vi.hoisted(() => ({
  loadEquipmentCatalog: vi.fn(),
  loadCurrentSceneIntoStore: vi.fn(),
  loadNamedSceneIntoStore: vi.fn(),
}))

vi.mock('@/services/loadEquipmentCatalog', () => ({
  loadEquipmentCatalog: editorPageMocks.loadEquipmentCatalog,
}))

vi.mock('@/services/loadDemoScene', () => ({
  loadCurrentSceneIntoStore: editorPageMocks.loadCurrentSceneIntoStore,
  loadNamedSceneIntoStore: editorPageMocks.loadNamedSceneIntoStore,
}))

vi.mock('@/components/scene/EditorCanvas', () => ({
  EditorCanvas: () => <div data-testid="editor-canvas" />,
}))

vi.mock('@/components/panels/DevicePalette', () => ({
  DevicePalette: () => <aside>DevicePalette</aside>,
}))

vi.mock('@/components/panels/EditorCanvasHud', () => ({
  EditorCanvasHud: () => null,
}))

vi.mock('@/components/panels/EditorDeck', () => ({
  EditorDeck: () => null,
}))

vi.mock('@/components/panels/PropertiesPanel', () => ({
  PropertiesPanel: () => <aside>PropertiesPanel</aside>,
}))

vi.mock('@/components/panels/SceneJsonToolbar', () => ({
  SceneJsonToolbar: () => <footer>SceneJsonToolbar</footer>,
}))

describe('EditorPage', () => {
  beforeEach(() => {
    cleanup()
    editorPageMocks.loadEquipmentCatalog.mockReset()
    editorPageMocks.loadCurrentSceneIntoStore.mockReset()
    editorPageMocks.loadNamedSceneIntoStore.mockReset()
    editorPageMocks.loadEquipmentCatalog.mockResolvedValue([])
    editorPageMocks.loadCurrentSceneIntoStore.mockResolvedValue({ ok: true, data: undefined })
    editorPageMocks.loadNamedSceneIntoStore.mockResolvedValue({ ok: true, data: {} })
  })

  afterEach(() => {
    cleanup()
  })

  it('loads a named scene when sceneId query is provided', async () => {
    render(
      <MemoryRouter initialEntries={['/editor?sceneId=scene-day']}>
        <Routes>
          <Route path="/editor" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      assert.equal(editorPageMocks.loadNamedSceneIntoStore.mock.calls[0]?.[0], 'scene-day')
    })
    assert.equal(editorPageMocks.loadCurrentSceneIntoStore.mock.calls.length, 0)
  })
})
