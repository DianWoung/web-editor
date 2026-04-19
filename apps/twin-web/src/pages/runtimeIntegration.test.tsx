import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { OverviewPage } from './overview/OverviewPage'
import { DeviceDetailPage } from './detail/DeviceDetailPage'
import type { SceneFile } from '@/schemas/scene'
import { useRuntimeStore } from '@/store/runtimeStore'
import { useSceneStore } from '@/store/sceneStore'

vi.mock('@/components/scene/ViewerCanvas', () => ({
  ViewerCanvas: () => <div data-testid="viewer-canvas" />,
}))

vi.mock('@/components/charts/TrendChart', () => ({
  TrendChart: () => <div data-testid="trend-chart" />,
}))

vi.mock('@/services/loadEquipmentCatalog', () => ({
  loadEquipmentCatalog: vi.fn(async () => []),
}))

const testScene: SceneFile = {
  version: 1,
  devices: [
    {
      id: 'CHW-PUMP-1',
      type: 'pump',
      name: 'CHW Pump 1',
      assetId: 'chw_pump_v1',
      position: [0, 0.35, 0],
      rotation: [0, 0, 0],
      system: 'CHW',
      tags: [],
      boundsHalfExtents: [0.35, 0.35, 0.35],
    },
  ],
  portGroups: [{ deviceId: 'CHW-PUMP-1', ports: [] }],
  pipes: [],
}

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/detail/CHW-PUMP-1']}>
      <Routes>
        <Route path="/detail/:deviceId" element={<DeviceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('runtime page integration', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    cleanup()
    useSceneStore.getState().clearScene()
    useRuntimeStore.getState().clear()
    useSceneStore.getState().loadScene(testScene)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    cleanup()
    useSceneStore.getState().clearScene()
    useRuntimeStore.getState().clear()
  })

  it('overview page renders backend runtime aggregates', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      assert.equal(String(input), '/api/runtime/overview')
      return new Response(
        JSON.stringify({
          totalPower: 512.4,
          avgCop: 5.23,
          activeAlarmCount: 2,
          lastUpdatedAt: '2026-04-02T00:00:00.000Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as typeof fetch

    render(
      <MemoryRouter initialEntries={['/scenes/scene-day/overview']}>
        <Routes>
          <Route path="/scenes/:sceneId/overview" element={<OverviewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByText('当前场景运行态')
    await screen.findByText('512.4 kW')
    await screen.findByText('5.23')
    await screen.findByText('2')
    await screen.findByText('运行态更新时间：2026-04-02T00:00:00.000Z')
    await screen.findByRole('link', { name: '返回场景工作台' })
    await screen.findByRole('button', { name: '重置视角' })
  })

  it('detail page renders backend runtime details and retains strategy copy', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      assert.equal(String(input), '/api/runtime/devices/CHW-PUMP-1')
      return new Response(
        JSON.stringify({
          deviceId: 'CHW-PUMP-1',
          deviceName: 'CHW Pump 1',
          system: 'CHW',
          onlineStatus: 'degraded',
          updatedAt: '2026-04-02T00:00:00.000Z',
          points: [{ id: 'power', name: '实时功率', value: 18.4, unit: 'kW', quality: 'stale' }],
          alarms: [{ id: 'A-1', level: 'critical', message: 'Snapshot alarm', time: '2026-04-02T00:00:00.000Z' }],
          trend: [{ t: '2026-04-02T00:00:00.000Z', v: 18.4 }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as typeof fetch

    renderDetailPage()

    await screen.findByRole('heading', { name: 'CHW Pump 1' })
    await screen.findByText(/状态 degraded/)
    await screen.findByText('实时功率')
    await screen.findByText((content, element) => {
      return element?.tagName === 'TD' && content.replace(/\s+/g, ' ').trim() === '18.4 kW'
    })
    await screen.findByText('Snapshot alarm')
    await screen.findByRole('heading', { name: /运行模式 · AI_OPT/ })
    await screen.findByRole('heading', { name: '策略说明' })
    await screen.findByRole('heading', { name: 'AI 建议' })
  })
})
