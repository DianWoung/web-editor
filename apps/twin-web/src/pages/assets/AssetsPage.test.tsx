import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { AssetsPage } from './AssetsPage'

const assetPageMocks = vi.hoisted(() => ({
  listAssets: vi.fn(),
  createAssetDraft: vi.fn(),
  getAssetDetail: vi.fn(),
  listTopologyTemplates: vi.fn(),
  getTopologyTemplate: vi.fn(),
  applyTopologyTemplate: vi.fn(),
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
  listTopologyTemplates: assetPageMocks.listTopologyTemplates,
  getTopologyTemplate: assetPageMocks.getTopologyTemplate,
  applyTopologyTemplate: assetPageMocks.applyTopologyTemplate,
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
    topologyTemplateId: null,
    topologyTemplateKey: null,
    topologyTemplateName: null,
    createdAt: '2026-04-08T10:00:00.000Z',
    updatedAt: '2026-04-08T10:00:00.000Z',
  }
}

function makeTemplate() {
  return {
    id: 'tpl_chw_supply_return',
    templateKey: 'chw_supply_return',
    displayName: '双口 CHW 供回水',
    category: 'water_loop',
    description: '适用于标准冷冻水双口设备，包含一个回水入口和一个供水出口。',
    defaultSystem: 'CHW',
    connectorCount: 2,
    updatedAt: '2026-04-18T10:00:00.000Z',
  }
}

function makeDetail(status: 'draft' | 'published' | 'archived' = 'draft') {
  return {
    asset: makeAsset('asset-1', status),
    connectors: [
      {
        id: 'in',
        connectorKey: 'in',
        portKey: 'in',
        name: '入口',
        system: 'HW',
        role: 'return',
        medium: 'water',
        direction: 'in',
        side: 'left',
        groupKey: 'load_loop',
        required: true,
        sortOrder: 0,
        geometry: {
          anchor: [-0.2, 0, 0] as [number, number, number],
          normal: [-1, 0, 0] as [number, number, number],
        },
      },
    ],
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
    const templateDetail = {
      ...makeTemplate(),
      connectors: [
        {
          id: 'tpl-chw-in',
          connectorKey: 'chw_in',
          name: '冷冻回水入口',
          system: 'CHW',
          role: 'return',
          medium: 'water',
          direction: 'in',
          required: true,
          sortOrder: 0,
          geometry: {
            anchor: [-1.2, 0, 0] as [number, number, number],
            normal: [-1, 0, 0] as [number, number, number],
          },
        },
        {
          id: 'tpl-chw-out',
          connectorKey: 'chw_out',
          name: '冷冻供水出口',
          system: 'CHW',
          role: 'supply',
          medium: 'water',
          direction: 'out',
          required: true,
          sortOrder: 1,
          geometry: {
            anchor: [1.2, 0, 0] as [number, number, number],
            normal: [1, 0, 0] as [number, number, number],
          },
        },
      ],
    }
    assetPageMocks.listAssets.mockResolvedValue({ items: [makeAsset()] })
    assetPageMocks.getAssetDetail.mockResolvedValue(makeDetail())
    assetPageMocks.listTopologyTemplates.mockResolvedValue({ items: [makeTemplate()] })
    assetPageMocks.getTopologyTemplate.mockResolvedValue(templateDetail)
    assetPageMocks.applyTopologyTemplate.mockResolvedValue({
      template: templateDetail,
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
        {
          id: 'chw_out',
          connectorKey: 'chw_out',
          portKey: 'chw_out',
          name: '冷冻供水出口',
          system: 'CHW',
          role: 'supply',
          medium: 'water',
          direction: 'out',
          side: null,
          groupKey: null,
          required: true,
          sortOrder: 1,
          geometry: {
            anchor: [1.2, 0, 0] as [number, number, number],
            normal: [1, 0, 0] as [number, number, number],
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
        {
          id: 'chw_out',
          portKey: 'chw_out',
          name: '冷冻供水出口',
          position: [1.2, 0, 0] as [number, number, number],
          system: 'CHW',
          direction: 'out',
          sortOrder: 1,
        },
      ],
    })
    assetPageMocks.listAssetVersions.mockResolvedValue({ items: [] })
    assetPageMocks.createAssetDraft.mockResolvedValue(makeDetail())
    assetPageMocks.updateAsset.mockResolvedValue(makeDetail())
    assetPageMocks.replaceAssetPorts.mockResolvedValue({ ports: makeDetail().ports, connectors: makeDetail().connectors })
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
  }, 10000)

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

    fireEvent.change(screen.getByLabelText('连接拓扑模板'), { target: { value: 'tpl_chw_supply_return' } })
    fireEvent.click(screen.getByRole('button', { name: '应用模板' }))
    await waitFor(() => {
      assert.equal(assetPageMocks.applyTopologyTemplate.mock.calls[0]?.[1], 'tpl_chw_supply_return')
    })
    await screen.findByRole('link', { name: '进入端点定位' })
    await screen.findByText('2/2 已完成')

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

  it('renders connector placement summary on the asset page instead of the inline workbench', async () => {
    assetPageMocks.getAssetDetail.mockResolvedValue({
      ...makeDetail(),
      connectors: [
        ...makeDetail().connectors,
        {
          id: 'out',
          connectorKey: 'out',
          portKey: 'out',
          name: '出口',
          system: 'HW',
          role: 'supply',
          medium: 'water',
          direction: 'out',
          side: 'right',
          groupKey: 'load_loop',
          required: true,
          sortOrder: 1,
          geometry: {
            anchor: [0.2, 0, 0] as [number, number, number],
            normal: [1, 0, 0] as [number, number, number],
          },
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/assets']}>
        <Routes>
          <Route path="/assets" element={<AssetsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Heat Pump' })
    await screen.findByRole('heading', { name: '端点定位摘要' })
    await screen.findByRole('link', { name: '进入端点定位' })
    await screen.findByText('2/2 已完成')
    assert.equal(screen.queryByLabelText('连接点角色'), null)
    assert.equal(screen.queryByRole('button', { name: '新增连接点' }), null)
    assert.equal(screen.queryByRole('heading', { name: '端点定位工作台' }), null)
  })

  it('applies a topology template and only exposes connector name and required as editable overrides', async () => {
    render(
      <MemoryRouter initialEntries={['/assets']}>
        <Routes>
          <Route path="/assets" element={<AssetsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Heat Pump' })
    await screen.findByRole('button', { name: '应用模板' })

    fireEvent.change(screen.getByLabelText('连接拓扑模板'), { target: { value: 'tpl_chw_supply_return' } })
    fireEvent.click(screen.getByRole('button', { name: '应用模板' }))

    await waitFor(() => {
      assert.equal(assetPageMocks.applyTopologyTemplate.mock.calls[0]?.[1], 'tpl_chw_supply_return')
    })

    await screen.findByText('2/2 已完成')
    await screen.findByText('所有必需端点已定位，可以继续发布')
    await screen.findByRole('link', { name: '进入端点定位' })
    assert.equal(screen.queryByRole('heading', { name: '端点定位工作台' }), null)
    assert.equal(screen.queryByLabelText('连接点角色'), null)
    assert.equal(screen.queryByRole('button', { name: '新增连接点' }), null)
  })

})
