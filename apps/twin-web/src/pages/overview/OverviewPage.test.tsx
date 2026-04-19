import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'

import { OverviewPage } from './OverviewPage'
import type { SceneLibraryResponse } from '@/schemas/scene'

const overviewMocks = vi.hoisted(() => ({
  loadEquipmentCatalog: vi.fn(),
  listNamedScenes: vi.fn(),
  loadNamedSceneIntoStore: vi.fn(),
  loadCurrentSceneIntoStore: vi.fn(),
}))

vi.mock('@/components/scene/ViewerCanvas', () => ({
  ViewerCanvas: () => <div data-testid="viewer-canvas" />,
}))

vi.mock('@/services/loadEquipmentCatalog', () => ({
  loadEquipmentCatalog: overviewMocks.loadEquipmentCatalog,
}))

vi.mock('@/services/loadDemoScene', () => ({
  listNamedScenes: overviewMocks.listNamedScenes,
  loadNamedSceneIntoStore: overviewMocks.loadNamedSceneIntoStore,
  loadCurrentSceneIntoStore: overviewMocks.loadCurrentSceneIntoStore,
}))

vi.mock('@/hooks/useRuntimePolling', () => ({
  useRuntimePolling: () => {},
}))

vi.mock('@/hooks/useSyncRuntimeWithScene', () => ({
  useSyncRuntimeWithScene: () => {},
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function okList(items: SceneLibraryResponse['items']) {
  return { ok: true as const, data: { items } }
}

describe('OverviewPage', () => {
  beforeEach(() => {
    cleanup()
    overviewMocks.loadEquipmentCatalog.mockReset()
    overviewMocks.listNamedScenes.mockReset()
    overviewMocks.loadNamedSceneIntoStore.mockReset()
    overviewMocks.loadCurrentSceneIntoStore.mockReset()
    overviewMocks.loadEquipmentCatalog.mockResolvedValue([])
    overviewMocks.loadNamedSceneIntoStore.mockResolvedValue({ ok: true, data: {} })
    overviewMocks.loadCurrentSceneIntoStore.mockResolvedValue({ ok: true, data: undefined })
  })

  afterEach(() => {
    cleanup()
  })

  it('clears stale scene metadata while the next scene metadata is still loading', async () => {
    const firstList = deferred<ReturnType<typeof okList>>()
    const secondList = deferred<ReturnType<typeof okList>>()

    overviewMocks.listNamedScenes
      .mockReturnValueOnce(firstList.promise)
      .mockReturnValueOnce(secondList.promise)

    const router = createMemoryRouter(
      [
        {
          path: '/scenes/:sceneId/overview',
          element: <OverviewPage />,
        },
      ],
      { initialEntries: ['/scenes/scene-a/overview'] },
    )

    render(<RouterProvider router={router} />)

    firstList.resolve(
      okList([
        {
          id: 'scene-a',
          name: '场景 A',
          remark: 'A 备注',
          updatedAt: '2026-04-19T00:00:00.000Z',
          deviceCount: 1,
          pipeCount: 0,
          isCurrent: false,
        },
      ]),
    )

    await screen.findByRole('heading', { name: '场景 A' })
    await screen.findByText('A 备注')

    await router.navigate('/scenes/scene-b/overview')

    await waitFor(() => {
      assert.equal(screen.getByRole('heading', { name: '运行态总览' }).textContent, '运行态总览')
    })
    await screen.findByText('围绕当前场景承接运行摘要、业务指标与设备详情跳转。')

    secondList.resolve(okList([]))
  })

  it('clears stale metadata when the scene metadata request fails', async () => {
    overviewMocks.listNamedScenes
      .mockResolvedValueOnce(
        okList([
          {
            id: 'scene-a',
            name: '场景 A',
            remark: 'A 备注',
            updatedAt: '2026-04-19T00:00:00.000Z',
            deviceCount: 1,
            pipeCount: 0,
            isCurrent: false,
          },
        ]),
      )
      .mockResolvedValueOnce({ ok: false as const, error: 'metadata unavailable' })

    const router = createMemoryRouter(
      [
        {
          path: '/scenes/:sceneId/overview',
          element: <OverviewPage />,
        },
      ],
      { initialEntries: ['/scenes/scene-a/overview'] },
    )

    render(<RouterProvider router={router} />)

    await screen.findByRole('heading', { name: '场景 A' })
    await screen.findByText('A 备注')

    await router.navigate('/scenes/scene-b/overview')

    await waitFor(() => {
      assert.equal(screen.getByRole('heading', { name: '运行态总览' }).textContent, '运行态总览')
    })
    await screen.findByText('围绕当前场景承接运行摘要、业务指标与设备详情跳转。')
  })
})
