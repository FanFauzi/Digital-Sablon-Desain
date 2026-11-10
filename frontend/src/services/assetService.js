import api from './api'

const assetObjectUrlCache = new Map()

export function buildAssetContentPath(assetId) {
  return `/api/v1/assets/${Number(assetId)}/content`
}

export function extractAssetId(input) {
  if (!input) return null

  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    return Math.trunc(input)
  }

  if (typeof input === 'object') {
    const directId = Number(input.uploadedAssetId)
    if (Number.isFinite(directId) && directId > 0) {
      return Math.trunc(directId)
    }

    return extractAssetId(input.assetUrl) || extractAssetId(input.src)
  }

  if (typeof input === 'string') {
    const match = input.match(/\/assets\/(\d+)\/content(?:\?.*)?$/)
    if (match) {
      return Number(match[1])
    }
  }

  return null
}

export function cacheAssetObjectUrl(assetId, objectUrl, blob = null) {
  const normalizedId = Number(assetId)
  if (!Number.isFinite(normalizedId) || normalizedId <= 0 || !objectUrl) {
    return
  }

  assetObjectUrlCache.set(normalizedId, {
    objectUrl,
    blob,
  })
}

export function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new Error('Format data gambar tidak valid.')
  }

  const separatorIndex = dataUrl.indexOf(',')
  if (separatorIndex === -1) {
    throw new Error('Data gambar Base64 tidak lengkap.')
  }

  const header = dataUrl.slice(0, separatorIndex)
  const base64 = dataUrl.slice(separatorIndex + 1)
  const mimeMatch = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/i)
  const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png'

  const binaryString = window.atob(base64.replace(/\s+/g, ''))
  const bytes = new Uint8Array(binaryString.length)

  for (let index = 0; index < binaryString.length; index++) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return new Blob([bytes], {
    type: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
  })
}

export async function uploadDesignAsset(fileOrBlob, fallbackName = 'design-image.png') {
  if (!(fileOrBlob instanceof Blob)) {
    throw new Error('File gambar tidak valid untuk diunggah.')
  }

  const extension = fileOrBlob.type === 'image/jpeg' ? 'jpg' : 'png'
  const fileName =
    typeof fileOrBlob.name === 'string' && fileOrBlob.name.trim()
      ? fileOrBlob.name.trim()
      : fallbackName.endsWith(`.${extension}`)
        ? fallbackName
        : `${fallbackName.replace(/\.[a-z0-9]+$/i, '')}.${extension}`

  const formData = new FormData()
  formData.append('image', fileOrBlob, fileName)

  try {
    const response = await api.post('/assets', formData)
    return response.data.data
  } catch (error) {
    const serverMessage =
      error.response?.data?.errors?.image?.[0] ||
      error.response?.data?.message ||
      error.message ||
      'Gagal mengunggah file gambar ke server.'

    throw new Error(serverMessage, { cause: error })
  }
}

export async function fetchDesignAssetObjectUrl(assetId) {
  const normalizedId = Number(assetId)
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw new Error('ID aset gambar tidak valid.')
  }

  const cached = assetObjectUrlCache.get(normalizedId)
  if (cached?.objectUrl) {
    return cached.objectUrl
  }

  try {
    const response = await api.get(`/assets/${normalizedId}/content`, {
      responseType: 'blob',
    })

    const blob = response.data
    const objectUrl = URL.createObjectURL(blob)

    assetObjectUrlCache.set(normalizedId, {
      objectUrl,
      blob,
    })

    return objectUrl
  } catch (error) {
    const serverMessage =
      error.response?.status === 404
        ? 'File gambar desain tidak ditemukan atau bukan milik akun ini.'
        : error.response?.data?.message ||
          error.message ||
          'Gagal memuat file gambar dari server.'

    throw new Error(serverMessage, { cause: error })
  }
}
