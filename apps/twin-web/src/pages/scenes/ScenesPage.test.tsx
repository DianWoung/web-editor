import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ScenesPage } from './ScenesPage'

const scenesPageMocks = vi.hoisted(() => ({
  listNamedScenes: vi.fn(),
  fetchNamedScene: vi.fn(),
  createEmptyNamedScene: vi.fn(),
}))

vi.mock('@/services/loadDemoScene', () => ({
  listNamedScenes: scenesPageMocks.listNamedScenes,
  fetchNamedScene: scenesPageMocks.fetchNamedScene,
  createEmptyNamedScene: scenesPageMocks.createEmptyNamedScene,
}))

describe('ScenesPage', () => {
  beforeEach(() => {
    cleanup()
    scenesPageMocks.listNamedScenes.mockReset()
    scenesPageMocks.fetchNamedScene.mockReset()
    scenesPageMocks.createEmptyNamedScene.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders named scenes and previews the selected scene', async () => {
    scenesPageMocks.listNamedScenes.mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 'scene-day',
            name: '白天工况',
            updatedAt: '2026-04-06T08:00:00.000Z',
            deviceCount: 2,
            pipeCount: 1,
            isCurrent: true,
          },
        ],
      },
    })
    scenesPageMocks.fetchNamedScene.mockResolvedValue({
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
          {
            id: 'PUMP-01',
            type: 'pump',
            name: '水泵 1',
            assetId: 'parallel_pump_skid_iot_v1',
            position: [1, 0, 0],
            rotation: [0, 0, 0],
            system: 'CHW',
            tags: [],
            boundsHalfExtents: [1, 1, 1],
          },
        ],
        portGroups: [],
        pipes: [{ id: 'PIPE-1', from: 'CH-01.out', to: 'PUMP-01.in', system: 'CHW', routeType: 'orthogonal', level: 'main' }],
      },
    })

    render(
      <MemoryRouter initialEntries={['/scenes']}>
        <Routes>
          <Route path="/scenes" element={<ScenesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: '白天工况' })
    await screen.findByRole('link', { name: '预览' })
    await screen.findByText('设备数')
    await screen.findByText('2')
    await screen.findByText('主机 1')
    await screen.findByText(/CH-01.out → PUMP-01.in/)
  })

  it('creates a new scene and exposes edit entry', async () => {
    scenesPageMocks.listNamedScenes
      .mockResolvedValueOnce({ ok: true, data: { items: [] } })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            {
              id: 'scene-night',
              name: '夜间工况',
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
      data: { sceneId: 'scene-night', name: '夜间工况', updatedAt: '2026-04-06T09:00:00.000Z' },
    })
    scenesPageMocks.fetchNamedScene.mockResolvedValue({
      ok: true,
      data: { version: 1, devices: [], portGroups: [], pipes: [] },
    })

    render(
      <MemoryRouter initialEntries={['/scenes']}>
        <Routes>
          <Route path="/scenes" element={<ScenesPage />} />
          <Route path="/editor" element={<div>Editor Route</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('新建场景名称'), { target: { value: '夜间工况' } })
    fireEvent.click(screen.getByRole('button', { name: '创建并编辑' }))

    await waitFor(() => {
      assert.equal(scenesPageMocks.createEmptyNamedScene.mock.calls[0]?.[0], '夜间工况')
    })
    await screen.findByText('Editor Route')
  })
})
