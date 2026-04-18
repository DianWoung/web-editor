import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { TopologyTemplatesPage } from './TopologyTemplatesPage'

const templatePageMocks = vi.hoisted(() => ({
  listTopologyTemplates: vi.fn(),
  getTopologyTemplate: vi.fn(),
  createTopologyTemplate: vi.fn(),
  updateTopologyTemplate: vi.fn(),
}))

vi.mock('@/services/api/assetsApi', () => ({
  listTopologyTemplates: templatePageMocks.listTopologyTemplates,
  getTopologyTemplate: templatePageMocks.getTopologyTemplate,
  createTopologyTemplate: templatePageMocks.createTopologyTemplate,
  updateTopologyTemplate: templatePageMocks.updateTopologyTemplate,
}))

function makeTemplateListItem() {
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

function makeTemplateDetail() {
  return {
    ...makeTemplateListItem(),
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
}

describe('TopologyTemplatesPage', () => {
  beforeEach(() => {
    cleanup()
    for (const mock of Object.values(templatePageMocks)) {
      mock.mockReset()
    }
    templatePageMocks.listTopologyTemplates.mockResolvedValue({ items: [makeTemplateListItem()] })
    templatePageMocks.getTopologyTemplate.mockResolvedValue(makeTemplateDetail())
    templatePageMocks.createTopologyTemplate.mockResolvedValue({
      ...makeTemplateDetail(),
      id: 'tpl_new',
      templateKey: 'new_template',
      displayName: '新模板',
    })
    templatePageMocks.updateTopologyTemplate.mockResolvedValue({
      ...makeTemplateDetail(),
      displayName: '双口 CHW 模板已更新',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders template list and allows saving updates', async () => {
    render(
      <MemoryRouter initialEntries={['/assets/topology-templates']}>
        <Routes>
          <Route path="/assets/topology-templates" element={<TopologyTemplatesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: '连接拓扑模板库' })
    await screen.findByRole('button', { name: /双口 CHW 供回水/ })
    await screen.findByDisplayValue('双口 CHW 供回水')

    fireEvent.change(screen.getByLabelText('模板名称'), { target: { value: '双口 CHW 模板已更新' } })
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))

    await waitFor(() => {
      assert.equal(templatePageMocks.updateTopologyTemplate.mock.calls[0]?.[0], 'tpl_chw_supply_return')
      assert.equal(templatePageMocks.updateTopologyTemplate.mock.calls[0]?.[1].displayName, '双口 CHW 模板已更新')
    })
  })

  it('creates a new template draft and saves it', async () => {
    render(
      <MemoryRouter initialEntries={['/assets/topology-templates']}>
        <Routes>
          <Route path="/assets/topology-templates" element={<TopologyTemplatesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: '连接拓扑模板库' })
    await screen.findByDisplayValue('双口 CHW 供回水')
    fireEvent.click(screen.getByRole('button', { name: '新建模板' }))

    fireEvent.change(screen.getByLabelText('模板标识'), { target: { value: 'new_template' } })
    fireEvent.change(screen.getByLabelText('模板名称'), { target: { value: '新模板' } })
    fireEvent.click(screen.getByRole('button', { name: '新增连接点' }))
    fireEvent.change(screen.getByLabelText('连接点 key'), { target: { value: 'new_connector' } })
    fireEvent.change(screen.getByLabelText('连接点名称'), { target: { value: '新连接点' } })
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))

    await waitFor(() => {
      assert.equal(templatePageMocks.createTopologyTemplate.mock.calls[0]?.[0].templateKey, 'new_template')
      assert.equal(templatePageMocks.createTopologyTemplate.mock.calls[0]?.[0].connectors.length, 1)
    })
  })
})
