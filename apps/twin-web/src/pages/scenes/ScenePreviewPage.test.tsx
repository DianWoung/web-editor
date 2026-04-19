import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ScenePreviewPage } from './ScenePreviewPage'

const previewPageMocks = vi.hoisted(() => ({
  fetchNamedScene: vi.fn(),
  loadEquipmentCatalog: vi.fn(),
  listNamedScenes: vi.fn(),
}))

vi.mock('@/services/loadDemoScene', () => ({
  fetchNamedScene: previewPageMocks.fetchNamedScene,
  listNamedScenes: previewPageMocks.listNamedScenes,
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
    previewPageMocks.listNamedScenes.mockReset()
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
    previewPageMocks.listNamedScenes.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 'scene-day',
            name: '白天工况',
            remark: '白天冷站运行',
            updatedAt: '2026-04-06T08:00:00.000Z',
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

  it('loads scene summary metadata into the shared preview shell', async () => {
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
    await screen.findByText('效果预览')
    await screen.findByRole('link', { name: '返回场景工作台' })
    await screen.findByRole('link', { name: '进入编辑' })
    await screen.findByRole('button', { name: '重置视角' })
    await screen.findByText('白天冷站运行')
    await screen.findByText(/最近更新/)
    await screen.findByTestId('scene-preview-canvas')
    assert.equal(
      document.querySelector('.scene-preview-canvas-shell')?.classList.contains('scene-preview-canvas-shell--full'),
      true,
    )
    await screen.findByText('场景摘要')
    assert.equal(screen.queryByRole('heading', { name: '设备预览' }), null)
    assert.equal(screen.queryByRole('heading', { name: '管线预览' }), null)
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
