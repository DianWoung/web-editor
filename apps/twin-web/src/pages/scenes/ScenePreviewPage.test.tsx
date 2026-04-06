import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ScenePreviewPage } from './ScenePreviewPage'

const previewPageMocks = vi.hoisted(() => ({
  fetchNamedScene: vi.fn(),
  loadEquipmentCatalog: vi.fn(),
}))

vi.mock('@/services/loadDemoScene', () => ({
  fetchNamedScene: previewPageMocks.fetchNamedScene,
}))

vi.mock('@/services/loadEquipmentCatalog', () => ({
  loadEquipmentCatalog: previewPageMocks.loadEquipmentCatalog,
}))

vi.mock('@/components/scene/ScenePreviewCanvas', () => ({
  ScenePreviewCanvas: ({ flowEnabled }: { flowEnabled: boolean }) => (
    <div data-testid="scene-preview-canvas" data-flow-enabled={flowEnabled ? 'yes' : 'no'} />
  ),
}))

describe('ScenePreviewPage', () => {
  beforeEach(() => {
    cleanup()
    previewPageMocks.fetchNamedScene.mockReset()
    previewPageMocks.loadEquipmentCatalog.mockReset()
    previewPageMocks.fetchNamedScene.mockResolvedValue({
      ok: true,
      data: {
        version: 1,
        devices: [
          {
            id: 'CH-01',
            type: 'chiller',
            name: '主机 1',
            assetId: 'large_air_cooled_chiller_iot_v1',
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            system: 'CHW',
            tags: [],
            boundsHalfExtents: [1, 1, 1],
          },
        ],
        portGroups: [],
        pipes: [],
      },
    })
    previewPageMocks.loadEquipmentCatalog.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('loads a named scene and renders preview actions', async () => {
    render(
      <MemoryRouter initialEntries={['/scenes/scene-day/preview']}>
        <Routes>
          <Route path="/scenes/:sceneId/preview" element={<ScenePreviewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      assert.equal(previewPageMocks.fetchNamedScene.mock.calls[0]?.[0], 'scene-day')
    })
    await screen.findByRole('link', { name: '返回场景管理' })
    await screen.findByRole('link', { name: '进入编辑' })
    await screen.findByTestId('scene-preview-canvas')
  })

  it('toggles flow mode for the preview canvas', async () => {
    render(
      <MemoryRouter initialEntries={['/scenes/scene-day/preview']}>
        <Routes>
          <Route path="/scenes/:sceneId/preview" element={<ScenePreviewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const canvas = await screen.findByTestId('scene-preview-canvas')
    assert.equal(canvas.getAttribute('data-flow-enabled'), 'no')

    fireEvent.click(screen.getByLabelText('预览流动状态'))

    await waitFor(() => {
      assert.equal(screen.getByTestId('scene-preview-canvas').getAttribute('data-flow-enabled'), 'yes')
    })
  })
})
