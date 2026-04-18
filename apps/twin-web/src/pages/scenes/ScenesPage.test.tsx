import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ScenesPage } from './ScenesPage'

const scenesPageMocks = vi.hoisted(() => ({
  listNamedScenes: vi.fn(),
  createEmptyNamedScene: vi.fn(),
  deleteNamedScene: vi.fn(),
}))

vi.mock('@/services/loadDemoScene', () => ({
  listNamedScenes: scenesPageMocks.listNamedScenes,
  createEmptyNamedScene: scenesPageMocks.createEmptyNamedScene,
  deleteNamedScene: scenesPageMocks.deleteNamedScene,
}))

describe('ScenesPage', () => {
  beforeEach(() => {
    cleanup()
    scenesPageMocks.listNamedScenes.mockReset()
    scenesPageMocks.createEmptyNamedScene.mockReset()
    scenesPageMocks.deleteNamedScene.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders scenes in a single compact card list', async () => {
    scenesPageMocks.listNamedScenes.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 'scene-day',
            name: '白天工况',
            remark: '白天冷站运行',
            updatedAt: '2026-04-06T08:00:00.000Z',
            deviceCount: 2,
            pipeCount: 1,
            isCurrent: true,
          },
        ],
      },
    })

    render(
      <MemoryRouter initialEntries={['/scenes']}>
        <Routes>
          <Route path="/scenes" element={<ScenesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: '场景' })
    await screen.findByRole('button', { name: '新增场景' })
    await screen.findByText('白天工况')
    await screen.findByRole('link', { name: '总览' })
    await screen.findByRole('link', { name: '预览' })
    await screen.findByText('白天冷站运行')
    await screen.findByText('2 台设备')
    await screen.findByText('1 条管线')
    assert.equal(screen.queryByRole('heading', { name: '状态' }), null)
    assert.equal(screen.queryByRole('button', { name: '刷新列表' }), null)
  }, 10000)

  it('creates a new scene with remark and exposes edit entry', async () => {
    scenesPageMocks.listNamedScenes
      .mockResolvedValueOnce({ ok: true, data: { items: [] } })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            {
              id: 'scene-night',
              name: '夜间工况',
              remark: '夜间低负荷',
              updatedAt: '2026-04-06T09:00:00.000Z',
              deviceCount: 0,
              pipeCount: 0,
              isCurrent: false,
            },
          ],
        },
    })
    scenesPageMocks.createEmptyNamedScene.mockResolvedValue({
      ok: true,
      data: { sceneId: 'scene-night', name: '夜间工况', remark: '夜间低负荷', updatedAt: '2026-04-06T09:00:00.000Z' },
    })
    render(
      <MemoryRouter initialEntries={['/scenes']}>
        <Routes>
          <Route path="/scenes" element={<ScenesPage />} />
          <Route path="/editor" element={<div>Editor Route</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '新增场景' }))
    await screen.findByRole('heading', { name: '新增场景' })
    fireEvent.change(screen.getByLabelText('新建场景名称'), { target: { value: '夜间工况' } })
    fireEvent.change(screen.getByLabelText('新建场景备注'), { target: { value: '夜间低负荷' } })
    fireEvent.click(screen.getByRole('button', { name: '创建并编辑' }))

    await waitFor(() => {
      assert.equal(scenesPageMocks.createEmptyNamedScene.mock.calls[0]?.[0], '夜间工况')
      assert.equal(scenesPageMocks.createEmptyNamedScene.mock.calls[0]?.[1], '夜间低负荷')
    })
    await screen.findByText('Editor Route')
  })

  it('confirms before deleting a named scene', async () => {
    scenesPageMocks.listNamedScenes
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            {
              id: 'scene-delete',
              name: '待删除场景',
              remark: '需要确认删除',
              updatedAt: '2026-04-06T10:00:00.000Z',
              deviceCount: 1,
              pipeCount: 0,
              isCurrent: false,
            },
          ],
        },
      })
      .mockResolvedValueOnce({ ok: true, data: { items: [] } })
    scenesPageMocks.deleteNamedScene.mockResolvedValue({ ok: true, data: { sceneId: 'scene-delete' } })

    render(
      <MemoryRouter initialEntries={['/scenes']}>
        <Routes>
          <Route path="/scenes" element={<ScenesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: '待删除场景' })
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    await screen.findByText(/删除后不可恢复/)
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }))

    await waitFor(() => {
      assert.equal(scenesPageMocks.deleteNamedScene.mock.calls[0]?.[0], 'scene-delete')
    })
  })
})
