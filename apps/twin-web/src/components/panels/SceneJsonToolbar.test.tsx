import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { SceneJsonToolbar } from './SceneJsonToolbar'

const sceneToolbarMocks = vi.hoisted(() => ({
  loadDemoSceneIntoStore: vi.fn(),
}))

vi.mock('@/services/loadDemoScene', () => ({
  loadDemoSceneIntoStore: sceneToolbarMocks.loadDemoSceneIntoStore,
}))

describe('SceneJsonToolbar utility controls', () => {
  beforeEach(() => {
    cleanup()
    sceneToolbarMocks.loadDemoSceneIntoStore.mockReset()
    sceneToolbarMocks.loadDemoSceneIntoStore.mockResolvedValue({ ok: true, data: undefined })
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps secondary scene utility controls but no longer renders save', async () => {
    render(
      <MemoryRouter initialEntries={['/editor?sceneId=scene-day']}>
        <SceneJsonToolbar />
      </MemoryRouter>,
    )

    screen.getByRole('button', { name: '导出 scene.json' })
    screen.getByRole('button', { name: '导入 JSON' })
    screen.getByRole('button', { name: '加载示例场景' })
    screen.getByRole('button', { name: '清空场景' })
    screen.getByRole('button', { name: '压测：80 台 + 管线' })
    screen.getByRole('link', { name: '打开场景管理' })
    assert.equal(screen.queryByRole('button', { name: '保存到后端' }), null)
  })
})
