import test from 'node:test'
import assert from 'node:assert/strict'

import { PRINT_PLACEMENT_PRESETS } from '../src/features/configurator/store/configuratorStore.js'
import { getPlacementFromPreset } from '../src/features/editor/utils/placementUtils.js'
import { getCloudProjectId } from '../src/utils/projectIds.js'

test('placement utility preserves position and size from every configured preset', () => {
  for (const preset of PRINT_PLACEMENT_PRESETS) {
    const placement = getPlacementFromPreset(preset.id, PRINT_PLACEMENT_PRESETS)

    assert.equal(placement.area, preset.side)
    assert.equal(placement.position_code, preset.code || preset.id)
    assert.equal(placement.position_x_percent, preset.position_x_percent)
    assert.equal(placement.position_y_percent, preset.position_y_percent)
    assert.equal(placement.width_percent, preset.width_percent)
  }
})

test('placement utility rejects unknown preset identifiers', () => {
  assert.throws(
    () => getPlacementFromPreset('not-a-real-zone', PRINT_PLACEMENT_PRESETS),
    /Preset penempatan desain tidak dikenali/
  )
})

test('cloud project identifier is normalized to the numeric server ID string', () => {
  assert.equal(getCloudProjectId('cloud:123'), '123')
})

test('local, missing, and malformed project identifiers are not sent to cloud APIs', () => {
  assert.equal(getCloudProjectId('local:123'), null)
  assert.equal(getCloudProjectId(null), null)
  assert.equal(getCloudProjectId('cloud:0'), null)
  assert.equal(getCloudProjectId('cloud:abc'), null)
  assert.equal(getCloudProjectId('cloud:12/exports'), null)
})
