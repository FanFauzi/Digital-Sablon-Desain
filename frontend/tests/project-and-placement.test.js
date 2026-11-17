import test from 'node:test'
import assert from 'node:assert/strict'

import { PRINT_PLACEMENT_PRESETS } from '../src/features/configurator/store/configuratorStore.js'
import { getPlacementFromPreset } from '../src/features/editor/utils/placementUtils.js'
import { getCloudProjectId } from '../src/utils/projectIds.js'
import { createAnalysisCacheKey } from '../src/features/editor/utils/analysisCacheKey.js'
import { syncCameraToPrintSide } from '../src/features/configurator/utils/cameraView.js'

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

test('AI analysis cache changes when the garment context changes', () => {
  const base = {
    editorId: 'artwork-1',
    currentSide: 'front',
    shirtType: 'tshirt',
    currentColor: '#ffffff',
  }

  assert.notEqual(
    createAnalysisCacheKey(base),
    createAnalysisCacheKey({ ...base, currentSide: 'back' })
  )
  assert.notEqual(
    createAnalysisCacheKey(base),
    createAnalysisCacheKey({ ...base, shirtType: 'hoodie' })
  )
  assert.notEqual(
    createAnalysisCacheKey(base),
    createAnalysisCacheKey({ ...base, currentColor: '#000000' })
  )
  assert.equal(createAnalysisCacheKey({ ...base, editorId: null }), null)
})

test('camera view updates only after the print side switch succeeds', async () => {
  let cameraView = 'front'
  let requestedSide = null

  const switched = await syncCameraToPrintSide(
    'back',
    async (side) => {
      requestedSide = side
      return true
    },
    (side) => {
      cameraView = side
    }
  )

  assert.equal(requestedSide, 'back')
  assert.equal(switched, true)
  assert.equal(cameraView, 'back')
})

test('camera view stays on the active side when the editor switch is blocked', async () => {
  let cameraView = 'front'

  const switched = await syncCameraToPrintSide(
    'back',
    async () => false,
    (side) => {
      cameraView = side
    }
  )

  assert.equal(switched, false)
  assert.equal(cameraView, 'front')
})
