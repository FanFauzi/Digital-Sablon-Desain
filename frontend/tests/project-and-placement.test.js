import test from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'

import { PRINT_PLACEMENT_PRESETS } from '../src/features/configurator/store/configuratorStore.js'
import { getPlacementFromPreset } from '../src/features/editor/utils/placementUtils.js'
import { getCloudProjectId } from '../src/utils/projectIds.js'
import { createAnalysisCacheKey } from '../src/features/editor/utils/analysisCacheKey.js'
import { syncCameraToPrintSide } from '../src/features/configurator/utils/cameraView.js'
import { addPngDpiMetadata } from '../src/features/editor/utils/pngDpiMetadata.js'

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

function pngCrc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const payload = Buffer.concat([typeBytes, data])
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  typeBytes.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(pngCrc32(payload), 8 + data.length)
  return chunk
}

function createTestPng(existingDpi = null) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const header = Buffer.alloc(13)
  header.writeUInt32BE(1, 0)
  header.writeUInt32BE(1, 4)
  header[8] = 8
  header[9] = 6

  const chunks = [
    pngChunk('IHDR', header),
  ]

  if (existingDpi) {
    const pixelsPerMeter = Math.round(existingDpi / 0.0254)
    const phys = Buffer.alloc(9)
    phys.writeUInt32BE(pixelsPerMeter, 0)
    phys.writeUInt32BE(pixelsPerMeter, 4)
    phys[8] = 1
    chunks.push(pngChunk('pHYs', phys))
  }

  chunks.push(
    pngChunk('IDAT', Buffer.from('789c636000020000050001', 'hex')),
    pngChunk('IEND', Buffer.alloc(0))
  )

  return new Blob([signature, ...chunks], { type: 'image/png' })
}

async function readPngChunks(blob) {
  const source = Buffer.from(await blob.arrayBuffer())
  const chunks = []
  let offset = 8

  while (offset + 12 <= source.length) {
    const length = source.readUInt32BE(offset)
    const type = source.toString('ascii', offset + 4, offset + 8)
    const data = source.subarray(offset + 8, offset + 8 + length)
    chunks.push({ type, data })
    offset += 12 + length
    if (type === 'IEND') break
  }

  return chunks
}

test('PNG export embeds the selected DPI as a valid pHYs chunk', async () => {
  const result = await addPngDpiMetadata(createTestPng(), 300)
  const chunks = await readPngChunks(result)
  const physChunks = chunks.filter((chunk) => chunk.type === 'pHYs')
  const idatIndex = chunks.findIndex((chunk) => chunk.type === 'IDAT')
  const physIndex = chunks.findIndex((chunk) => chunk.type === 'pHYs')
  const pixelsPerMeter = Math.round(300 / 0.0254)

  assert.equal(result.type, 'image/png')
  assert.equal(physChunks.length, 1)
  assert.equal(physChunks[0].data.length, 9)
  assert.equal(physChunks[0].data.readUInt32BE(0), pixelsPerMeter)
  assert.equal(physChunks[0].data.readUInt32BE(4), pixelsPerMeter)
  assert.equal(physChunks[0].data[8], 1)
  assert.ok(physIndex > chunks.findIndex((chunk) => chunk.type === 'IHDR'))
  assert.ok(physIndex < idatIndex)
})

test('PNG export replaces existing DPI metadata instead of duplicating it', async () => {
  const result = await addPngDpiMetadata(createTestPng(96), 300)
  const chunks = await readPngChunks(result)
  const physChunks = chunks.filter((chunk) => chunk.type === 'pHYs')

  assert.equal(physChunks.length, 1)
  assert.equal(physChunks[0].data.readUInt32BE(0), Math.round(300 / 0.0254))
})

test('PNG export rejects unsupported DPI values and truncated PNG files', async () => {
  await assert.rejects(() => addPngDpiMetadata(createTestPng(), 0), /72–600/)
  await assert.rejects(() => addPngDpiMetadata(createTestPng(), 601), /72–600/)
  await assert.rejects(
    () => addPngDpiMetadata(new Blob([Buffer.from([137, 80, 78, 71])]), 300),
    /PNG yang valid/
  )
  await assert.rejects(
    () => addPngDpiMetadata(new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])]), 300),
    /struktur IHDR, IDAT, atau IEND/
  )
})
