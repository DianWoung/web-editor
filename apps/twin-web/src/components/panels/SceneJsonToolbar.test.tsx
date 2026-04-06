import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { SceneJsonToolbar } from './SceneJsonToolbar'

const sceneToolbarMocks = vi.hoisted(() => ({
  saveCurrentSceneFromStore: vi.fn(),
  saveNamedSceneFromStore: vi.fn(),
  loadDemoSceneIntoStore: vi.fn(),
}))

vi.mock('@/services/loadDemoScene', () => ({
  loadDemoSceneIntoStore: sceneToolbarMocks.loadDemoSceneIntoStore,
  saveCurrentSceneFromStore: sceneToolbarMocks.saveCurrentSceneFromStore,
  saveNamedSceneFromStore: sceneToolbarMocks.saveNamedSceneFromStore,
}))

describe('SceneJsonToolbar save flow', () => {
  beforeEach(() => {
    cleanup()
    sceneToolbarMocks.loadDemoSceneIntoStore.mockReset()
    sceneToolbarMocks.saveCurrentSceneFromStore.mockReset()
    sceneToolbarMocks.saveNamedSceneFromStore.mockReset()
    sceneToolbarMocks.loadDemoSceneIntoStore.mockResolvedValue({ ok: true, data: undefined })
    sceneToolbarMocks.saveCurrentSceneFromStore.mockResolvedValue({ ok: true, data: { updatedAt: '2026-04-06T00:00:00.000Z' } })
    sceneToolbarMocks.saveNamedSceneFromStore.mockResolvedValue({ ok: true, data: { updatedAt: '2026-04-06T00:00:00.000Z' } })
  })

  afterEach(() => {
    cleanup()
  })

  it('saves the active named scene when sceneId query is present', async () => {
    render(
      <MemoryRouter initialEntries={['/editor?sceneId=scene-day']}>
        <SceneJsonToolbar />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '保存到后端' }))

    await waitFor(() => {
      assert.equal(sceneToolbarMocks.saveNamedSceneFromStore.mock.calls[0]?.[0], 'scene-day')
    })
    assert.equal(sceneToolbarMocks.saveCurrentSceneFromStore.mock.calls.length, 0)
  })
})
