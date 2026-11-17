const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function createCrc32Table() {
  const table = new Uint32Array(256)

  for (let value = 0; value < 256; value++) {
    let crc = value

    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1)
    }

    table[value] = crc >>> 0
  }

  return table
}

const CRC32_TABLE = createCrc32Table()

function calculateCrc32(bytes) {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint32BigEndian(view, offset, value) {
  view.setUint32(offset, value >>> 0, false)
}

function createPhysChunk(dpi) {
  const pixelsPerMeter = Math.round(dpi / 0.0254)
  const chunk = new Uint8Array(21)
  const view = new DataView(chunk.buffer)

  writeUint32BigEndian(view, 0, 9)
  chunk.set([112, 72, 89, 115], 4) // pHYs
  writeUint32BigEndian(view, 8, pixelsPerMeter)
  writeUint32BigEndian(view, 12, pixelsPerMeter)
  chunk[16] = 1 // pixels per meter

  const crcInput = chunk.subarray(4, 17)
  writeUint32BigEndian(view, 17, calculateCrc32(crcInput))

  return chunk
}

export async function addPngDpiMetadata(blob, dpi) {
  const numericDpi = Number(dpi)
  if (!Number.isFinite(numericDpi) || numericDpi < 72 || numericDpi > 600) {
    throw new Error('DPI ekspor harus berada pada rentang 72–600.')
  }

  const source = new Uint8Array(await blob.arrayBuffer())

  if (source.length < 8 || !PNG_SIGNATURE.every((value, index) => source[index] === value)) {
    throw new Error('Hasil ekspor bukan file PNG yang valid.')
  }

  const chunks = []
  let offset = 8
  let insertedPhys = false
  let foundImageData = false
  let foundEnd = false
  let foundHeader = false

  while (offset + 12 <= source.length) {
    const view = new DataView(source.buffer, source.byteOffset + offset, source.length - offset)
    const dataLength = view.getUint32(0, false)
    const chunkEnd = offset + 12 + dataLength

    if (chunkEnd > source.length) {
      throw new Error('Struktur PNG hasil ekspor tidak lengkap.')
    }

    const type = String.fromCharCode(
      source[offset + 4],
      source[offset + 5],
      source[offset + 6],
      source[offset + 7]
    )

    if (!foundHeader && type !== 'IHDR') {
      throw new Error('Struktur PNG tidak memiliki header IHDR di posisi pertama.')
    }
    if (type === 'IHDR') {
      if (foundHeader || dataLength !== 13) {
        throw new Error('Header IHDR pada PNG tidak valid.')
      }
      foundHeader = true
    }

    if (type === 'pHYs') {
      offset = chunkEnd
      continue
    }

    if (type === 'IDAT' && !insertedPhys) {
      chunks.push(createPhysChunk(numericDpi))
      insertedPhys = true
      foundImageData = true
    } else if (type === 'IDAT') {
      foundImageData = true
    }

    chunks.push(source.slice(offset, chunkEnd))
    offset = chunkEnd

    if (type === 'IEND') {
      if (dataLength !== 0) {
        throw new Error('Chunk IEND pada PNG tidak valid.')
      }
      foundEnd = true
      break
    }
  }

  if (!foundHeader || !foundImageData || !foundEnd || !insertedPhys) {
    throw new Error('PNG tidak memiliki struktur IHDR, IDAT, atau IEND yang lengkap.')
  }

  return new Blob([PNG_SIGNATURE, ...chunks], { type: 'image/png' })
}
