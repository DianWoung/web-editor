import assert from 'node:assert/strict'
import { describe, it } from 'vitest'

import { summarizeConnectorProgress } from './assetConnectorProgress'

describe('assetConnectorProgress', () => {
  it('reports completed, required remaining, and publish readiness', () => {
    const summary = summarizeConnectorProgress([
      {
        connectorKey: 'chw_in',
        required: true,
        geometry: {
          anchor: [0, 0, 0],
          normal: null,
        },
      },
      {
        connectorKey: 'chw_out',
        required: true,
        geometry: {
          anchor: [1.2, 0, 0],
          normal: null,
        },
      },
      {
        connectorKey: 'signal',
        required: false,
        geometry: {
          anchor: [0, 0, 0],
          normal: null,
        },
      },
    ] as never)

    assert.equal(summary.total, 3)
    assert.equal(summary.completed, 1)
    assert.equal(summary.requiredRemaining, 1)
    assert.equal(summary.publishReady, false)
    assert.equal(summary.riskText, '仍有 1 个必需端点未定位')
  })
})
