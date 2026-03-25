import test from 'node:test'
import assert from 'node:assert/strict'

import { collectAssetPackFiles } from './assetPackImport.ts'

test('collectAssetPackFiles accepts a directly selected single asset folder', () => {
  const grouped = collectAssetPackFiles([
    { name: 'asset.json', webkitRelativePath: 'large_air_cooled_chiller_iot_v1/asset.json' },
    { name: 'ports.json', webkitRelativePath: 'large_air_cooled_chiller_iot_v1/ports.json' },
    { name: 'model.glb', webkitRelativePath: 'large_air_cooled_chiller_iot_v1/model.glb' },
  ])

  assert.equal(Object.keys(grouped).length, 1)
  assert.ok(grouped.large_air_cooled_chiller_iot_v1?.assetFile)
  assert.ok(grouped.large_air_cooled_chiller_iot_v1?.portsFile)
  assert.ok(grouped.large_air_cooled_chiller_iot_v1?.glbFile)
})
