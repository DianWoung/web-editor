import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { EditorPage } from './EditorPage'

const editorPageMocks = vi.hoisted(() => ({
  loadEquipmentCatalog: vi.fn(),
  loadCurrentSceneIntoStore: vi.fn(),
  loadNamedSceneIntoStore: vi.fn(),
  saveCurrentSceneFromStore: vi.fn(),
  saveNamedSceneFromStore: vi.fn(),
  listNamedScenes: vi.fn(),
}))

vi.mock('@/services/loadEquipmentCatalog', () => ({
  loadEquipmentCatalog: editorPageMocks.loadEquipmentCatalog,
}))

vi.mock('@/services/loadDemoScene', () => ({
  loadCurrentSceneIntoStore: editorPageMocks.loadCurrentSceneIntoStore,
  loadNamedSceneIntoStore: editorPageMocks.loadNamedSceneIntoStore,
  saveCurrentSceneFromStore: editorPageMocks.saveCurrentSceneFromStore,
  saveNamedSceneFromStore: editorPageMocks.saveNamedSceneFromStore,
  listNamedScenes: editorPageMocks.listNamedScenes,
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
    editorPageMocks.saveCurrentSceneFromStore.mockReset()
    editorPageMocks.saveNamedSceneFromStore.mockReset()
    editorPageMocks.listNamedScenes.mockReset()
    editorPageMocks.loadEquipmentCatalog.mockResolvedValue([])
    editorPageMocks.loadCurrentSceneIntoStore.mockResolvedValue({ ok: true, data: undefined })
    editorPageMocks.loadNamedSceneIntoStore.mockResolvedValue({ ok: true, data: {} })
    editorPageMocks.saveCurrentSceneFromStore.mockResolvedValue({ ok: true, data: { updatedAt: '2026-04-07T00:00:00.000Z' } })
    editorPageMocks.saveNamedSceneFromStore.mockResolvedValue({
      ok: true,
      data: { updatedAt: '2026-04-07T00:00:00.000Z', name: '白天工况', remark: '默认备注' },
    })
    editorPageMocks.listNamedScenes.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 'scene-day',
            name: '白天工况',
            remark: '默认备注',
            updatedAt: '2026-04-07T00:00:00.000Z',
            deviceCount: 1,
            pipeCount: 0,
            isCurrent: false,
          },
        ],
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('loads named scene metadata into a simplified editor header', async () => {
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
    await screen.findByDisplayValue('白天工况')
    await screen.findByDisplayValue('默认备注')
    await screen.findByRole('button', { name: '保存' })
    await screen.findByRole('button', { name: '撤销' })
    await screen.findByRole('link', { name: '返回场景管理' })
    assert.equal(screen.queryByText('SceneJsonToolbar'), null)
  })
})
