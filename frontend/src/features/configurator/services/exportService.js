import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

function parseResolution(resString = '1024x1024') {
  const [wStr, hStr] = String(resString).toLowerCase().split('x')
  const width = Math.max(512, Math.min(4096, Number(wStr) || 1024))
  const height = Math.max(512, Math.min(4096, Number(hStr) || 1024))
  return { width, height }
}

function triggerBlobDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
}

/**
 * Ekspor gambar Mockup 3D (PNG atau JPG) dari elemen canvas Three.js pada resolusi target.
 */
export async function export3DMockupImage({
  gl,
  webglCanvas,
  scene,
  camera,
  format = 'png',
  resolution = '1024x1024',
  backgroundColor = '#E9E9E5',
  transparent = false,
  transparentBg = false,
  quality = 0.95,
  shirtName = 'tshirt',
  fileNamePrefix = '',
}) {
  const sourceCanvas = webglCanvas || gl?.domElement
  if (!sourceCanvas) {
    throw new Error('Kanvas 3D belum siap untuk diekspor.')
  }

  if (gl && scene && camera) {
    gl.render(scene, camera)
  }

  const { width, height } = parseResolution(resolution)
  const outCanvas = document.createElement('canvas')
  outCanvas.width = width
  outCanvas.height = height

  const ctx = outCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('Browser gagal menyiapkan kanvas ekspor mockup.')
  }

  const isJpg = format === 'jpg' || format === 'jpeg'
  const useTransparent = Boolean(transparent || transparentBg)

  if (isJpg || !useTransparent) {
    ctx.fillStyle =
      backgroundColor && backgroundColor !== 'transparent'
        ? backgroundColor
        : '#E9E9E5'
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  const srcW = sourceCanvas.width || 1024
  const srcH = sourceCanvas.height || 1024
  const scale = Math.min(width / srcW, height / srcH)
  const drawW = Math.round(srcW * scale)
  const drawH = Math.round(srcH * scale)
  const offsetX = Math.round((width - drawW) / 2)
  const offsetY = Math.round((height - drawH) / 2)

  ctx.drawImage(sourceCanvas, offsetX, offsetY, drawW, drawH)

  const mimeType = isJpg ? 'image/jpeg' : 'image/png'
  const ext = isJpg ? 'jpg' : 'png'

  const blob = await new Promise((resolve, reject) => {
    outCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Gagal membuat file gambar mockup.'))),
      mimeType,
      quality
    )
  })

  const safeName = String(fileNamePrefix || shirtName || 'garment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const fileName = `${safeName}-${width}x${height}-${Date.now()}.${ext}`
  triggerBlobDownload(blob, fileName)

  return {
    fileName,
    width,
    height,
    format: ext,
  }
}

/**
 * Ekspor model 3D pakaian beserta warna & tekstur desain ke dalam file binary .glb.
 */
export async function export3DModelGLB({
  targetObject,
  sceneObject,
  shirtName = 'tshirt',
  fileNamePrefix = '',
}) {
  const objectToExport = targetObject || sceneObject
  if (!objectToExport) {
    throw new Error('Objek 3D belum siap untuk diekspor ke GLB.')
  }

  const exporter = new GLTFExporter()
  const arrayBuffer = await new Promise((resolve, reject) => {
    exporter.parse(
      objectToExport,
      (result) => resolve(result),
      (error) => reject(error || new Error('Gagal mengekspor model GLB.')),
      { binary: true }
    )
  })

  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' })
  const safeName = String(fileNamePrefix || shirtName || 'garment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const fileName = `${safeName}-${Date.now()}.glb`
  triggerBlobDownload(blob, fileName)

  return { fileName, format: 'glb' }
}

/**
 * Rekam video animasi 3D selama beberapa detik dari kanvas WebGL.
 */
export async function export3DVideoWebM({
  gl,
  webglCanvas,
  durationMs = 4000,
  fps = 30,
  shirtName = 'tshirt',
  fileNamePrefix = '',
}) {
  const sourceCanvas = webglCanvas || gl?.domElement
  if (!sourceCanvas || typeof sourceCanvas.captureStream !== 'function') {
    throw new Error('Browser ini tidak mendukung perekaman video dari kanvas 3D.')
  }

  const stream = sourceCanvas.captureStream(fps)
  const mimeCandidates = [
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  const supportedMime =
    mimeCandidates.find(
      (type) =>
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
    ) || 'video/webm'

  const recorder = new MediaRecorder(stream, { mimeType: supportedMime })
  const chunks = []

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const recordingPromise = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: supportedMime })
      resolve(blob)
    }
    recorder.onerror = (err) => reject(err)
  })

  recorder.start()
  await new Promise((resolve) => window.setTimeout(resolve, durationMs))
  recorder.stop()

  const videoBlob = await recordingPromise
  const ext = supportedMime.includes('mp4') ? 'mp4' : 'webm'
  const safeName = String(fileNamePrefix || shirtName || 'garment')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const fileName = `${safeName}-animation-${Date.now()}.${ext}`
  triggerBlobDownload(videoBlob, fileName)

  return { fileName, format: ext }
}

export const export3DVideoAnimation = export3DVideoWebM
