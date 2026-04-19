import assert from 'node:assert/strict'
import { describe, it } from 'vitest'

import { getAssetPreviewModelUrl } from './assetModelPreview'

describe('assetModelPreview', () => {
  it('prefers explicit uploaded or api model urls', () => {
    assert.equal(getAssetPreviewModelUrl('pump_v1', '/api/assets/uploads/u1/model.glb'), '/api/assets/uploads/u1/model.glb')
    assert.equal(getAssetPreviewModelUrl('pump_v1', '/api/assets/models/pump_v1'), '/api/assets/models/pump_v1')
  })

  it('falls back to the public equipment asset path when no explicit model url exists', () => {
    assert.equal(getAssetPreviewModelUrl('large_air_cooled_chiller_iot_v1', null), '/equipment/large_air_cooled_chiller_iot_v1/model.glb')
  })

  it('returns null when there is no asset key or explicit url', () => {
    assert.equal(getAssetPreviewModelUrl('', null), null)
    assert.equal(getAssetPreviewModelUrl(null, null), null)
  })
})
