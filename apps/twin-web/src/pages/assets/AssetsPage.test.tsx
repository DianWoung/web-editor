import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AssetsPage } from './AssetsPage'

const assetPageMocks = vi.hoisted(() => ({
  listAssets: vi.fn(),
  createAssetDraft: vi.fn(),
  getAssetDetail: vi.fn(),
  updateAsset: vi.fn(),
  replaceAssetPorts: vi.fn(),
  replaceAssetBindings: vi.fn(),
  uploadAssetModel: vi.fn(),
  publishAsset: vi.fn(),
  archiveAsset: vi.fn(),
  deleteAsset: vi.fn(),
  listAssetVersions: vi.fn(),
}))

vi.mock('@/services/api/assetsApi', () => ({
  listAssets: assetPageMocks.listAssets,
  createAssetDraft: assetPageMocks.createAssetDraft,
  getAssetDetail: assetPageMocks.getAssetDetail,
  updateAsset: assetPageMocks.updateAsset,
  replaceAssetPorts: assetPageMocks.replaceAssetPorts,
  replaceAssetBindings: assetPageMocks.replaceAssetBindings,
  uploadAssetModel: assetPageMocks.uploadAssetModel,
  publishAsset: assetPageMocks.publishAsset,
  archiveAsset: assetPageMocks.archiveAsset,
  deleteAsset: assetPageMocks.deleteAsset,
  listAssetVersions: assetPageMocks.listAssetVersions,
}))

function makeAsset(id = 'asset-1', status: 'draft' | 'published' | 'archived' = 'draft') {
  return {
    id,
    assetKey: 'heat_pump_v1',
    displayName: 'Heat Pump',
    type: 'heat-pump',
    defaultSystem: 'HW',
    assetVersion: 1,
    renderStyle: 'box' as const,
    bounds: { halfExtents: [1.2, 1.8, 1.1] as [number, number, number] },
    modelUrl: null,
    status,
    createdAt: '2026-04-08T10:00:00.000Z',
    updatedAt: '2026-04-08T10:00:00.000Z',
  }
}

function makeDetail(status: 'draft' | 'published' | 'archived' = 'draft') {
  return {
    asset: makeAsset('asset-1', status),
    ports: [
      {
        id: 'in',
        portKey: 'in',
        name: '入口',
        position: [-0.2, 0, 0] as [number, number, number],
        system: 'HW',
        direction: 'in',
        sortOrder: 0,
      },
    ],
    bindings: [
      {
        id: 'bind-1',
        bindingType: 'device_identity' as const,
        bindingKey: 'bacnet_device_id',
        bindingValue: '1001',
        note: 'demo',
      },
    ],
  }
}

describe('AssetsPage', () => {
  beforeEach(() => {
    cleanup()
    for (const mock of Object.values(assetPageMocks)) {
      mock.mockReset()
    }
    assetPageMocks.listAssets.mockResolvedValue({ items: [makeAsset()] })
    assetPageMocks.getAssetDetail.mockResolvedValue(makeDetail())
    assetPageMocks.listAssetVersions.mockResolvedValue({ items: [] })
    assetPageMocks.createAssetDraft.mockResolvedValue(makeDetail())
    assetPageMocks.updateAsset.mockResolvedValue(makeDetail())
    assetPageMocks.replaceAssetPorts.mockResolvedValue({ ports: makeDetail().ports })
    assetPageMocks.replaceAssetBindings.mockResolvedValue({ bindings: makeDetail().bindings })
    assetPageMocks.uploadAssetModel.mockResolvedValue({
      upload: {
        id: 'upload-1',
        fileName: 'model.glb',
        storageKey: 'asset-uploads/upload-1/model.glb',
        publicUrl: '/api/assets/uploads/upload-1/model.glb',
        mimeType: 'model/gltf-binary',
        sizeBytes: 12,
        uploadStatus: 'uploaded',
        createdAt: '2026-04-08T10:10:00.000Z',
      },
    })
    assetPageMocks.publishAsset.mockResolvedValue(makeDetail('published'))
    assetPageMocks.archiveAsset.mockResolvedValue(makeDetail('archived'))
    assetPageMocks.deleteAsset.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders assets, loads details, and supports status filtering', async () => {
    render(
      <MemoryRouter initialEntries={['/assets']}>
        <Routes>
          <Route path="/assets" element={<AssetsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Heat Pump' })
    fireEvent.change(screen.getByLabelText('状态筛选'), { target: { value: 'published' } })

    await waitFor(() => {
      assert.equal(assetPageMocks.listAssets.mock.calls.at(-1)?.[0], 'published')
    })
  })

  it('creates, edits, publishes, archives, and deletes an asset', async () => {
    render(
      <MemoryRouter initialEntries={['/assets']}>
        <Routes>
          <Route path="/assets" element={<AssetsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Heat Pump' })

    fireEvent.change(screen.getByLabelText('新资产标识'), { target: { value: 'tower_v1' } })
    fireEvent.change(screen.getByLabelText('新资产名称'), { target: { value: 'Cooling Tower' } })
    fireEvent.click(screen.getByRole('button', { name: '新建资产草稿' }))

    await waitFor(() => {
      assert.equal(assetPageMocks.createAssetDraft.mock.calls[0]?.[0].assetKey, 'tower_v1')
    })

    fireEvent.change(screen.getByLabelText('显示名称'), { target: { value: 'Heat Pump Updated' } })
    fireEvent.click(screen.getByRole('button', { name: '保存基础信息' }))
    await waitFor(() => {
      assert.equal(assetPageMocks.updateAsset.mock.calls[0]?.[1].displayName, 'Heat Pump Updated')
    })

    fireEvent.click(screen.getByRole('button', { name: '保存端口' }))
    await waitFor(() => {
      assert.equal(assetPageMocks.replaceAssetPorts.mock.calls[0]?.[1].length, 1)
    })

    fireEvent.click(screen.getByRole('button', { name: '保存绑定' }))
    await waitFor(() => {
      assert.equal(assetPageMocks.replaceAssetBindings.mock.calls[0]?.[1].length, 1)
    })

    fireEvent.click(screen.getByRole('button', { name: '发布' }))
    await waitFor(() => {
      assert.equal(assetPageMocks.publishAsset.mock.calls[0]?.[0], 'asset-1')
    })

    fireEvent.click(screen.getByRole('button', { name: '下线' }))
    await waitFor(() => {
      assert.equal(assetPageMocks.archiveAsset.mock.calls[0]?.[0], 'asset-1')
    })

    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    await waitFor(() => {
      assert.equal(assetPageMocks.deleteAsset.mock.calls[0]?.[0], 'asset-1')
    })
  })

  it('uploads a model file and renders the returned URL', async () => {
    render(
      <MemoryRouter initialEntries={['/assets']}>
        <Routes>
          <Route path="/assets" element={<AssetsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Heat Pump' })
    const file = new File(['glb'], 'model.glb', { type: 'model/gltf-binary' })
    fireEvent.change(screen.getByLabelText('选择模型文件'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: '上传模型' }))

    await waitFor(() => {
      assert.equal(assetPageMocks.uploadAssetModel.mock.calls[0]?.[0].name, 'model.glb')
    })
    await screen.findByText(/\/api\/assets\/uploads\/upload-1\/model\.glb/)
  })
})
