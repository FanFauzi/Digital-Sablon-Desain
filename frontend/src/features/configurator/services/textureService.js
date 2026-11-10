import * as THREE from 'three'

const fabricTextureCache = new Map()
const acidWashTextureCache = new Map()

/**
 * Menghasilkan bump/normal texture prosedural untuk serat kain (Cotton, Combed, Polyester, Fleece).
 */
export function getFabricBumpTexture(fabricType = 'cotton_combed', repeatScale = 28) {
  const cacheKey = `${fabricType}:${repeatScale}`
  if (fabricTextureCache.has(cacheKey)) {
    return fabricTextureCache.get(cacheKey)
  }

  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)

  const step = fabricType === 'fleece' ? 4 : fabricType === 'polyester' ? 2 : 3

  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const weave = ((x / step + y / step) % 2 === 0) ? 18 : -18
      const jitter = Math.sin(x * 0.37 + y * 0.71) * 10
      const v = Math.max(0, Math.min(255, Math.round(128 + weave + jitter)))
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(x, y, step - 1, step - 1)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatScale, repeatScale)
  texture.needsUpdate = true

  fabricTextureCache.set(cacheKey, texture)
  return texture
}

/**
 * Menghasilkan tekstur efek Acid Wash (distressed / washed garment dye) yang dikombinasikan dengan warna dasar kaos.
 */
export function getAcidWashTexture(baseColorHex = '#121212', intensity = 0.45, scale = 3.5) {
  const safeIntensity = Number(intensity || 0.45).toFixed(2)
  const safeScale = Number(scale || 3.5).toFixed(1)
  const cacheKey = `${baseColorHex}:${safeIntensity}:${safeScale}`

  if (acidWashTextureCache.has(cacheKey)) {
    return acidWashTextureCache.get(cacheKey)
  }

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const baseColor = new THREE.Color(baseColorHex || '#121212')
  const washedColor = baseColor.clone().lerp(new THREE.Color('#d4d4d8'), 0.65)

  const imgData = ctx.createImageData(size, size)
  const data = imgData.data
  const freq = Math.max(1, Number(scale) || 3.5)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * freq * Math.PI * 2
      const ny = (y / size) * freq * Math.PI * 2

      // Multi-octave pseudo-cellular marble noise untuk pola acid wash
      const n1 = Math.sin(nx + Math.cos(ny * 1.3)) * Math.cos(ny - Math.sin(nx * 1.7))
      const n2 = Math.sin(nx * 2.3 - ny * 1.9) * 0.5
      const n3 = Math.cos((nx + ny) * 4.1) * 0.25
      const raw = (n1 + n2 + n3 + 1.75) / 3.5

      const factor = Math.max(0, Math.min(1, Math.pow(raw, 1.6) * Number(intensity)))
      const r = Math.round((baseColor.r * (1 - factor) + washedColor.r * factor) * 255)
      const g = Math.round((baseColor.g * (1 - factor) + washedColor.g * factor) * 255)
      const b = Math.round((baseColor.b * (1 - factor) + washedColor.b * factor) * 255)

      const idx = (y * size + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  texture.needsUpdate = true

  acidWashTextureCache.set(cacheKey, texture)
  return texture
}

/**
 * Menghasilkan bump map dari alpha channel tekstur desain untuk efek sablon timbul (Puff Print).
 */
export function createPuffPrintBumpMap(imageElement) {
  if (!imageElement) return null
  const w = Math.min(512, imageElement.naturalWidth || imageElement.width || 256)
  const h = Math.min(512, imageElement.naturalHeight || imageElement.height || 256)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(imageElement, 0, 0, w, h)
  const srcData = ctx.getImageData(0, 0, w, h).data
  const outImg = ctx.createImageData(w, h)
  const dstData = outImg.data

  for (let i = 0; i < srcData.length; i += 4) {
    const alpha = srcData[i + 3]
    // Gunakan alpha sebagai ketinggian permukaan tinta timbul
    dstData[i] = alpha
    dstData[i + 1] = alpha
    dstData[i + 2] = alpha
    dstData[i + 3] = 255
  }

  ctx.putImageData(outImg, 0, 0)

  const bumpTexture = new THREE.CanvasTexture(canvas)
  bumpTexture.needsUpdate = true
  return bumpTexture
}
