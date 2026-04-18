import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AssetConnectorPlacementPage } from './AssetConnectorPlacementPage'

const placementPageMocks = vi.hoisted(() => ({
  getAssetDetail: vi.fn(),
  replaceAssetPorts: vi.fn(),
}))

vi.mock('@/services/api/assetsApi', async () => {
  const actual = await vi.importActual<typeof import('@/services/api/assetsApi')>('@/services/api/assetsApi')
  return {
    ...actual,
    getAssetDetail: placementPageMocks.getAssetDetail,
    replaceAssetPorts: placementPageMocks.replaceAssetPorts,
  }
})

vi.mock('@/components/assets/AssetConnectorWorkbench', () => ({
  AssetConnectorWorkbench: ({
    onSave,
  }: {
    onSave: () => void
  }) => (
    <div>
      <div data-testid="connector-workbench" />
      <button type="button" onClick={onSave}>
        保存连接点
      </button>
    </div>
  ),
}))

function makeDetail() {
  return {
    asset: {
      id: 'asset-1',
      assetKey: 'heat_pump_v1',
      displayName: 'Heat Pump',
      type: 'heat-pump',
      defaultSystem: 'HW',
      assetVersion: 1,
      renderStyle: 'box' as const,
      bounds: { halfExtents: [1.2, 1.8, 1.1] as [number, number, number] },
      modelUrl: null,
      status: 'draft' as const,
      topologyTemplateId: 'tpl_chw_supply_return',
      topologyTemplateKey: 'chw_supply_return',
      topologyTemplateName: '双口 CHW 供回水',
      createdAt: '2026-04-08T10:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z',
    },
    connectors: [
      {
        id: 'chw_in',
        connectorKey: 'chw_in',
        portKey: 'chw_in',
        name: '冷冻回水入口',
        system: 'CHW',
        role: 'return',
        medium: 'water',
        direction: 'in',
        side: null,
        groupKey: null,
        required: true,
        sortOrder: 0,
        geometry: {
          anchor: [-1.2, 0, 0] as [number, number, number],
          normal: [-1, 0, 0] as [number, number, number],
        },
      },
    ],
    ports: [
      {
        id: 'chw_in',
        portKey: 'chw_in',
        name: '冷冻回水入口',
        position: [-1.2, 0, 0] as [number, number, number],
        system: 'CHW',
        direction: 'in',
        sortOrder: 0,
      },
    ],
    bindings: [],
  }
}

describe('AssetConnectorPlacementPage', () => {
  beforeEach(() => {
    cleanup()
    placementPageMocks.getAssetDetail.mockReset()
    placementPageMocks.replaceAssetPorts.mockReset()
    placementPageMocks.getAssetDetail.mockResolvedValue(makeDetail())
    placementPageMocks.replaceAssetPorts.mockResolvedValue({
      connectors: makeDetail().connectors,
      ports: makeDetail().ports,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the connector placement route with a back link and save flow', async () => {
    render(
      <MemoryRouter initialEntries={['/assets/asset-1/connectors']}>
        <Routes>
          <Route path="/assets/:assetId/connectors" element={<AssetConnectorPlacementPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: '端点定位' })
    await screen.findByRole('link', { name: '返回资产页' })
    await screen.findByTestId('connector-workbench')

    fireEvent.click(screen.getAllByRole('button', { name: '保存连接点' })[0])
    await waitFor(() => {
      assert.equal(placementPageMocks.replaceAssetPorts.mock.calls[0]?.[0], 'asset-1')
    })
  })
})
