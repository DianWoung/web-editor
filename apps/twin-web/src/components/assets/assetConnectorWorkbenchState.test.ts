import assert from 'node:assert/strict'
import { describe, it } from 'vitest'

import {
  completeAndAdvance,
  createPlacementState,
  pointToAnchor,
  projectAnchorToViewport,
} from './assetConnectorWorkbenchState'

describe('assetConnectorWorkbenchState', () => {
  const bounds = [2, 4, 6] as [number, number, number]

  it('maps front-view clicks to local anchor coordinates', () => {
    assert.deepEqual(pointToAnchor('front', { x: 0.5, y: 0.5 }, bounds, [1, 2, 3]), [0, 0, 3])
    assert.deepEqual(pointToAnchor('front', { x: 1, y: 0 }, bounds, [1, 2, 3]), [2, 4, 3])
  })

  it('maps right and top views to the expected axes', () => {
    assert.deepEqual(pointToAnchor('right', { x: 0, y: 1 }, bounds, [1, 2, 3]), [1, -4, -6])
    assert.deepEqual(pointToAnchor('top', { x: 0.75, y: 0.25 }, bounds, [1, 2, 3]), [1, 2, 3])
  })

  it('projects anchors back into viewport percentages', () => {
    assert.deepEqual(projectAnchorToViewport('front', [0, 0, 0], bounds), { x: 0.5, y: 0.5 })
    assert.deepEqual(projectAnchorToViewport('right', [0, 4, -6], bounds), { x: 0, y: 0 })
    assert.deepEqual(projectAnchorToViewport('top', [2, 0, 6], bounds), { x: 1, y: 0 })
  })

  it('marks the current connector done and advances to the next one', () => {
    const placement = createPlacementState(['chw_in', 'chw_out', 'cw_in'])

    const afterFirst = completeAndAdvance(placement, 'chw_in')
    assert.equal(afterFirst.statusByConnector.chw_in, 'done')
    assert.equal(afterFirst.activeConnectorKey, 'chw_out')

    const afterSecond = completeAndAdvance(
      {
        ...afterFirst,
        statusByConnector: {
          ...afterFirst.statusByConnector,
          chw_out: 'placed',
        },
      },
      'chw_out',
    )
    assert.equal(afterSecond.statusByConnector.chw_out, 'done')
    assert.equal(afterSecond.activeConnectorKey, 'cw_in')
  })
})
