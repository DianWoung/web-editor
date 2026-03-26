import test from 'node:test'
import assert from 'node:assert/strict'

import {
  FLOW_DRIVEN_WIND_TURBINE_ASSET_ID,
  shouldUseEmbeddedWindTurbineAnimation,
  shouldUseWindTurbineManualFallback,
} from './windTurbineAnimation.ts'

test('wind turbine with embedded clips uses the GLB animation instead of manual rotation', () => {
  assert.equal(shouldUseEmbeddedWindTurbineAnimation(FLOW_DRIVEN_WIND_TURBINE_ASSET_ID, 1), true)
  assert.equal(shouldUseWindTurbineManualFallback(FLOW_DRIVEN_WIND_TURBINE_ASSET_ID, 1), false)
})

test('wind turbine without embedded clips is the only case allowed to fall back to manual rotation', () => {
  assert.equal(shouldUseEmbeddedWindTurbineAnimation(FLOW_DRIVEN_WIND_TURBINE_ASSET_ID, 0), false)
  assert.equal(shouldUseWindTurbineManualFallback(FLOW_DRIVEN_WIND_TURBINE_ASSET_ID, 0), true)
})

test('non-wind assets never opt into turbine animation paths', () => {
  assert.equal(shouldUseEmbeddedWindTurbineAnimation('large_air_cooled_chiller_iot_v1', 3), false)
  assert.equal(shouldUseWindTurbineManualFallback('large_air_cooled_chiller_iot_v1', 0), false)
})
