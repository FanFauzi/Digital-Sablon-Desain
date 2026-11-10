import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  IText,
  Rect,
} from 'fabric'

import { EDITOR_CONFIG } from '../utils/editorConfig'
import api from '../../../services/api'
import {
  buildAssetContentPath,
  cacheAssetObjectUrl,
  dataUrlToBlob,
  extractAssetId,
  fetchDesignAssetObjectUrl,
  uploadDesignAsset,
} from '../../../services/assetService'

const SERIALIZED_OBJECT_PROPS = [
  'editorId',
  'editorName',
  'uploadedAssetId',
  'assetUrl',
]

function createPrintBoundary(printArea = EDITOR_CONFIG.printArea) {
  const boundary = new Rect({
    left: printArea.left,
    top: printArea.top,
    width: printArea.width,
    height: printArea.height,
    originX: 'left',
    originY: 'top',
    fill: 'rgba(0, 0, 0, 0)',
    stroke: '#a3a3a3',
    strokeWidth: 3,
    strokeDashArray: [12, 8],
    selectable: false,
    evented: false,
    excludeFromExport: true,
  })

  boundary.isPrintBoundary = true
  return boundary
}


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

async function addPngDpiMetadata(blob, dpi) {
  const source = new Uint8Array(await blob.arrayBuffer())

  if (source.length < 8 || !PNG_SIGNATURE.every((value, index) => source[index] === value)) {
    throw new Error('Hasil ekspor bukan file PNG yang valid.')
  }

  const chunks = []
  let offset = 8
  let insertedPhys = false

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

    if (type === 'pHYs') {
      offset = chunkEnd
      continue
    }

    if (type === 'IDAT' && !insertedPhys) {
      chunks.push(createPhysChunk(dpi))
      insertedPhys = true
    }

    chunks.push(source.slice(offset, chunkEnd))
    offset = chunkEnd

    if (type === 'IEND') break
  }

  if (!insertedPhys) {
    throw new Error('PNG tidak memiliki data gambar yang dapat diekspor.')
  }

  return new Blob([PNG_SIGNATURE, ...chunks], { type: 'image/png' })
}

function fitPrintAreaToPhysicalRatio(physicalWidthCm, physicalHeightCm) {
  const base = EDITOR_CONFIG.printArea
  const widthCm = Number(physicalWidthCm)
  const heightCm = Number(physicalHeightCm)

  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    return { ...base }
  }

  const targetRatio = widthCm / heightCm
  const maxRatio = base.width / base.height

  let width
  let height

  if (targetRatio >= maxRatio) {
    width = base.width
    height = width / targetRatio
  } else {
    height = base.height
    width = height * targetRatio
  }

  return {
    left: base.left + (base.width - width) / 2,
    top: base.top + (base.height - height) / 2,
    width,
    height,
  }
}

async function imageElementToBlob(element) {
  const width = element.naturalWidth || element.width
  const height = element.naturalHeight || element.height

  if (!width || !height) {
    throw new Error('Gambar pada proyek tidak dapat dibaca.')
  }

  const temporaryCanvas = document.createElement('canvas')
  temporaryCanvas.width = width
  temporaryCanvas.height = height

  const context = temporaryCanvas.getContext('2d')
  if (!context) {
    throw new Error('Browser tidak dapat menyiapkan gambar proyek.')
  }

  context.drawImage(element, 0, 0, width, height)

  const blob = await new Promise((resolve) => {
    temporaryCanvas.toBlob(resolve, 'image/png')
  })

  if (!blob) {
    throw new Error('Gagal menyiapkan file gambar proyek.')
  }

  return blob
}

const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024

export default function useDesignEditor(canvasElement) {
  const canvasRef = useRef(null)
  const printAreaRef = useRef({ ...EDITOR_CONFIG.printArea })
  const activeSideRef = useRef('front')
  const sideSnapshotsRef = useRef({ front: null, back: null })
  const isSwitchingSideRef = useRef(false)
  const imageAssetsRef = useRef(new Map())

  const [selectedObject, setSelectedObject] = useState(null)
  const [layers, setLayers] = useState([])

  const refreshLayers = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const objects = canvas.getObjects()
      .filter((object) => !object.isPrintBoundary)

    setLayers(
      objects.map((object, index) => ({
        id: object.editorId,
        name: object.editorName || `Objek ${index + 1}`,
        type: object.type,
      })).reverse()
    )
  }, [])

  const syncSelectedObject = useCallback((object) => {
    if (!object || object.isPrintBoundary) {
      setSelectedObject(null)
      return
    }

    setSelectedObject({
      id: object.editorId,
      name: object.editorName,
      left: Math.round(object.left || 0),
      top: Math.round(object.top || 0),
      width: Math.round(object.getScaledWidth()),
      height: Math.round(object.getScaledHeight()),
      angle: Math.round(object.angle || 0),
      type: object.type,
    })
  }, [])

  const [designPreview, setDesignPreview] = useState(null)
  const [designPreviewVersion, setDesignPreviewVersion] = useState(0)

  const refreshDesignPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { left, top, width, height } = printAreaRef.current
    const previousBackground = canvas.backgroundColor
    const printBoundaries = canvas.getObjects().filter((object) => object.isPrintBoundary)

    try {
      // Preview transparan hanya berisi desain di area cetak tanpa garis putus-putus batas cetak.
      canvas.backgroundColor = ''
      printBoundaries.forEach((boundary) => {
        boundary.visible = false
      })

      const preview = canvas.toDataURL({
        format: 'png',
        left,
        top,
        width,
        height,
        multiplier: 1,
        enableRetinaScaling: false,
      })
      setDesignPreview(preview)
      setDesignPreviewVersion((version) => version + 1)
    } finally {
      printBoundaries.forEach((boundary) => {
        boundary.visible = true
      })
      canvas.backgroundColor = previousBackground
      canvas.requestRenderAll()
    }
  }, [])

  useEffect(() => {
    if (!canvasElement.current) return

    const canvas = new Canvas(canvasElement.current, {
      width: EDITOR_CONFIG.width,
      height: EDITOR_CONFIG.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    })

    canvasRef.current = canvas

    const boundary = createPrintBoundary(printAreaRef.current)

    canvas.add(boundary)
    canvas.sendObjectToBack(boundary)

    const handleSelection = (event) => {
      const object = event.selected?.[0] || event.target
      syncSelectedObject(object)
      refreshLayers()
    }

    const handleSelectionCleared = () => {
      setSelectedObject(null)
    }

    const handleObjectChanged = (event) => {
      const object = event.target

      if (object && canvas.getActiveObject() === object) {
        syncSelectedObject(object)
      }

      refreshLayers()
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleSelectionCleared)

    canvas.on('object:moving', handleObjectChanged)
    canvas.on('object:scaling', handleObjectChanged)
    canvas.on('object:rotating', handleObjectChanged)
    canvas.on('object:modified', handleObjectChanged)
    canvas.on('object:modified', refreshDesignPreview)
    canvas.on('object:added', refreshLayers)
    canvas.on('object:added', refreshDesignPreview)
    canvas.on('object:removed', refreshLayers)
    canvas.on('object:removed', refreshDesignPreview)
    canvas.on('text:changed', refreshDesignPreview)
    canvas.on('text:editing:exited', refreshDesignPreview)

    return () => {
      canvas.dispose()
      canvasRef.current = null
    }
  }, [canvasElement, refreshLayers, refreshDesignPreview, syncSelectedObject])

  const uploadImage = useCallback(async (file) => {
    const canvas = canvasRef.current

    if (!canvas || !file) return

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      throw new Error('Format gambar harus PNG atau JPG.')
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error('Ukuran gambar maksimal 15 MB.')
    }

    const url = URL.createObjectURL(file)

    try {
      const image = await FabricImage.fromURL(url)

      const maxWidth = 600
      const maxHeight = 700

      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1
      )

      image.set({
        left: EDITOR_CONFIG.width / 2,
        top: EDITOR_CONFIG.height / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        cornerColor: '#171717',
        borderColor: '#171717',
        transparentCorners: false,
        cornerStyle: 'circle',
        padding: 5,
      })

      const editorId = crypto.randomUUID()
      image.editorId = editorId
      image.editorName = file.name
      image.uploadedAssetId = null
      image.assetUrl = null

      imageAssetsRef.current.set(editorId, {
        file,
        objectUrl: url,
        uploadedAssetId: null,
        assetUrl: null,
        originalName: file.name,
      })

      canvas.add(image)
      canvas.setActiveObject(image)
      canvas.requestRenderAll()

      syncSelectedObject(image)
      refreshLayers()
    } catch (error) {
      URL.revokeObjectURL(url)
      throw error
    }
  }, [refreshLayers, syncSelectedObject])

  const addText = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const text = new IText('Tulis desainmu', {
      left: 500,
      top: 600,
      originX: 'center',
      originY: 'center',
      fontSize: 65,
      fontFamily: 'Arial',
      fill: '#171717',
      fontWeight: 'bold',
    })

    text.editorId = crypto.randomUUID()
    text.editorName = 'Teks baru'

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.requestRenderAll()

    syncSelectedObject(text)
    refreshLayers()
  }, [refreshLayers, syncSelectedObject])

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()

    if (!canvas || !active || active.isPrintBoundary) return

    canvas.remove(active)
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    setSelectedObject(null)
    refreshLayers()
  }, [refreshLayers])

  const rotateSelected = useCallback((angle) => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()

    if (!canvas || !active || active.isPrintBoundary) return

    active.rotate((active.angle || 0) + angle)
    active.setCoords()

    canvas.requestRenderAll()
    syncSelectedObject(active)
    refreshDesignPreview()
  }, [refreshDesignPreview, syncSelectedObject])

  const moveLayer = useCallback((id, direction) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const object = canvas.getObjects()
      .find((item) => item.editorId === id)

    if (!object) return

    if (direction === 'up') {
      canvas.bringObjectForward(object)
    } else {
      canvas.sendObjectBackwards(object)
    }

    // Area cetak harus selalu berada di belakang seluruh objek desain.
    const printBoundary = canvas.getObjects()
      .find((item) => item.isPrintBoundary)

    if (printBoundary) {
      canvas.sendObjectToBack(printBoundary)
    }

    canvas.setActiveObject(object)
    canvas.requestRenderAll()

    syncSelectedObject(object)
    refreshLayers()
    refreshDesignPreview()
  }, [refreshDesignPreview, refreshLayers, syncSelectedObject])

  const selectLayer = useCallback((id) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const object = canvas.getObjects()
      .find((item) => item.editorId === id)

    if (!object) return

    canvas.setActiveObject(object)
    canvas.requestRenderAll()
    syncSelectedObject(object)
  }, [syncSelectedObject])

  const updateProperty = useCallback((property, value) => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()

    if (!canvas || !active || active.isPrintBoundary) return

    const number = Number(value)
    if (!Number.isFinite(number)) return

    if (property === 'width' || property === 'height') {
      const currentSize = property === 'width'
        ? active.getScaledWidth()
        : active.getScaledHeight()

      if (currentSize <= 0 || number <= 0) return

      const ratio = number / currentSize

      active.set({
        scaleX: active.scaleX * ratio,
        scaleY: active.scaleY * ratio,
      })
    } else {
      active.set(property, number)
    }

    active.setCoords()
    canvas.requestRenderAll()
    syncSelectedObject(active)
    refreshDesignPreview()
  }, [refreshDesignPreview, syncSelectedObject])

  const setPrintArea = useCallback((printAreaData) => {
    const canvas = canvasRef.current

    if (!canvas || !printAreaData) return

    const fittedArea = fitPrintAreaToPhysicalRatio(
      printAreaData.physical_width_cm,
      printAreaData.physical_height_cm
    )

    printAreaRef.current = fittedArea

    const boundary = canvas.getObjects().find((object) => object.isPrintBoundary)
    if (boundary) {
      boundary.set(fittedArea)
      boundary.setCoords()
    }

    canvas.requestRenderAll()
    refreshDesignPreview()
  }, [refreshDesignPreview])

  const serializeCurrentCanvas = useCallback(async () => {
    const canvas = canvasRef.current

    if (!canvas) {
      throw new Error('Kanvas desain belum siap untuk disimpan.')
    }

    const snapshot = canvas.toObject(SERIALIZED_OBJECT_PROPS)
    const designObjects = canvas.getObjects()
      .filter((object) => !object.isPrintBoundary)

    snapshot.objects = await Promise.all(
      designObjects.map(async (object) => {
        const serialized = object.toObject(SERIALIZED_OBJECT_PROPS)

        if (String(object.type || '').toLowerCase() === 'image') {
          const editorId = object.editorId || serialized.editorId || crypto.randomUUID()
          object.editorId = editorId
          serialized.editorId = editorId

          const existingMeta = imageAssetsRef.current.get(editorId) || null
          const assetId =
            extractAssetId(object) ||
            extractAssetId(serialized) ||
            existingMeta?.uploadedAssetId ||
            null

          if (assetId) {
            const contentPath = buildAssetContentPath(assetId)
            object.uploadedAssetId = assetId
            object.assetUrl = contentPath
            serialized.uploadedAssetId = assetId
            serialized.assetUrl = contentPath
          }

          if (existingMeta?.objectUrl) {
            serialized.src = existingMeta.objectUrl
          } else if (
            typeof serialized.src === 'string' &&
            (serialized.src.startsWith('blob:') ||
              serialized.src.startsWith('data:image/') ||
              extractAssetId(serialized.src))
          ) {
            // Gunakan src yang sudah ada tanpa merender ulang ke Base64 PNG.
          } else if (typeof object.getElement === 'function') {
            const blob = await imageElementToBlob(object.getElement())
            const objectUrl = URL.createObjectURL(blob)

            imageAssetsRef.current.set(editorId, {
              file: blob,
              objectUrl,
              uploadedAssetId: assetId,
              assetUrl: assetId ? buildAssetContentPath(assetId) : null,
              originalName: object.editorName || 'design-image.png',
            })

            serialized.src = objectUrl
          }

          serialized.crossOrigin = undefined
        }

        return serialized
      })
    )
    snapshot.background = '#ffffff'

    return snapshot
  }, [])

  const hydrateSnapshotForCanvas = useCallback(async (snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.objects)) {
      return snapshot
    }

    const hydratedObjects = await Promise.all(
      snapshot.objects.map(async (object) => {
        if (!object || String(object.type || '').toLowerCase() !== 'image') {
          return object
        }

        const editorId = object.editorId || crypto.randomUUID()
        const existingMeta = imageAssetsRef.current.get(editorId) || null
        const assetId = extractAssetId(object) || existingMeta?.uploadedAssetId || null

        if (existingMeta?.objectUrl) {
          if (assetId && !existingMeta.uploadedAssetId) {
            existingMeta.uploadedAssetId = assetId
            existingMeta.assetUrl = buildAssetContentPath(assetId)
          }

          return {
            ...object,
            editorId,
            uploadedAssetId: assetId || existingMeta.uploadedAssetId || null,
            assetUrl: assetId ? buildAssetContentPath(assetId) : existingMeta.assetUrl || null,
            src: existingMeta.objectUrl,
            crossOrigin: undefined,
          }
        }

        if (assetId) {
          const objectUrl = await fetchDesignAssetObjectUrl(assetId)
          const contentPath = buildAssetContentPath(assetId)

          imageAssetsRef.current.set(editorId, {
            file: null,
            objectUrl,
            uploadedAssetId: assetId,
            assetUrl: contentPath,
            originalName: object.editorName || 'design-image.png',
          })

          return {
            ...object,
            editorId,
            uploadedAssetId: assetId,
            assetUrl: contentPath,
            src: objectUrl,
            crossOrigin: undefined,
          }
        }

        return {
          ...object,
          editorId,
          crossOrigin: undefined,
        }
      })
    )

    return {
      ...snapshot,
      objects: hydratedObjects,
    }
  }, [])

  const applyCanvasSnapshot = useCallback(async (snapshot) => {
    const canvas = canvasRef.current

    if (!canvas) {
      throw new Error('Kanvas desain belum siap.')
    }

    canvas.discardActiveObject()
    canvas.clear()

    if (snapshot) {
      if (!Array.isArray(snapshot.objects)) {
        throw new Error('Data desain pada sisi ini tidak valid.')
      }

      const hydratedSnapshot = await hydrateSnapshotForCanvas(snapshot)
      await canvas.loadFromJSON(hydratedSnapshot)
    }

    canvas.backgroundColor = '#ffffff'

    const boundary = createPrintBoundary(printAreaRef.current)
    canvas.add(boundary)
    canvas.sendObjectToBack(boundary)
    canvas.requestRenderAll()

    setSelectedObject(null)
    refreshLayers()
    refreshDesignPreview()
  }, [hydrateSnapshotForCanvas, refreshDesignPreview, refreshLayers])

  const prepareSnapshotForCloud = useCallback(async (snapshot, isCurrentActiveSide = false) => {
    if (!snapshot || !Array.isArray(snapshot.objects)) {
      return {
        memorySnapshot: snapshot,
        cloudSnapshot: snapshot,
      }
    }

    const canvas = canvasRef.current
    const memoryObjects = []
    const cloudObjects = []

    for (const object of snapshot.objects) {
      if (!object || String(object.type || '').toLowerCase() !== 'image') {
        memoryObjects.push(object)
        cloudObjects.push(object)
        continue
      }

      const editorId = object.editorId || crypto.randomUUID()
      const existingMeta = imageAssetsRef.current.get(editorId) || null
      let assetId = extractAssetId(object) || existingMeta?.uploadedAssetId || null

      if (!assetId) {
        let blobToUpload = existingMeta?.file instanceof Blob ? existingMeta.file : null

        if (!blobToUpload && typeof object.src === 'string') {
          if (object.src.startsWith('data:image/')) {
            blobToUpload = dataUrlToBlob(object.src)
          } else if (object.src.startsWith('blob:')) {
            const blobResponse = await fetch(object.src)
            blobToUpload = await blobResponse.blob()
          }
        }

        if (!blobToUpload && isCurrentActiveSide && canvas) {
          const liveObject = canvas.getObjects().find((item) => item.editorId === editorId)
          if (liveObject && typeof liveObject.getElement === 'function') {
            blobToUpload = await imageElementToBlob(liveObject.getElement())
          }
        }

        if (!blobToUpload) {
          throw new Error('File gambar desain tidak ditemukan untuk diunggah ke server.')
        }

        const fileName =
          object.editorName ||
          existingMeta?.originalName ||
          'design-image.png'

        const uploadedAsset = await uploadDesignAsset(blobToUpload, fileName)
        assetId = Number(uploadedAsset.id)

        const contentPath = uploadedAsset.url || buildAssetContentPath(assetId)
        const objectUrl = existingMeta?.objectUrl || URL.createObjectURL(blobToUpload)

        cacheAssetObjectUrl(assetId, objectUrl, blobToUpload)
        imageAssetsRef.current.set(editorId, {
          file: blobToUpload,
          objectUrl,
          uploadedAssetId: assetId,
          assetUrl: contentPath,
          originalName: fileName,
        })

        if (isCurrentActiveSide && canvas) {
          const liveObject = canvas.getObjects().find((item) => item.editorId === editorId)
          if (liveObject) {
            liveObject.uploadedAssetId = assetId
            liveObject.assetUrl = contentPath
          }
        }
      }

      const contentPath = buildAssetContentPath(assetId)
      const latestMeta = imageAssetsRef.current.get(editorId) || existingMeta

      memoryObjects.push({
        ...object,
        editorId,
        uploadedAssetId: assetId,
        assetUrl: contentPath,
        src: latestMeta?.objectUrl || object.src || contentPath,
        crossOrigin: undefined,
      })

      cloudObjects.push({
        ...object,
        editorId,
        uploadedAssetId: assetId,
        assetUrl: contentPath,
        src: contentPath,
        crossOrigin: undefined,
      })
    }

    return {
      memorySnapshot: {
        ...snapshot,
        objects: memoryObjects,
      },
      cloudSnapshot: {
        ...snapshot,
        objects: cloudObjects,
      },
    }
  }, [])

  // Format proyek versi 2 menyimpan canvas depan dan belakang secara terpisah.
  // Gambar diunggah terpisah sebagai file aset agar payload JSON tidak memuat Base64 besar.
  const serializeCanvas = useCallback(async () => {
    const activeSide = activeSideRef.current
    const activeSnapshot = await serializeCurrentCanvas()
    const rawSides = {
      ...sideSnapshotsRef.current,
      [activeSide]: activeSnapshot,
    }

    const frontPrepared = await prepareSnapshotForCloud(
      rawSides.front,
      activeSide === 'front'
    )
    const backPrepared = await prepareSnapshotForCloud(
      rawSides.back,
      activeSide === 'back'
    )

    sideSnapshotsRef.current = {
      front: frontPrepared.memorySnapshot,
      back: backPrepared.memorySnapshot,
    }

    return {
      schemaVersion: 2,
      activeSide,
      sides: {
        front: frontPrepared.cloudSnapshot,
        back: backPrepared.cloudSnapshot,
      },
    }
  }, [prepareSnapshotForCloud, serializeCurrentCanvas])

  // Tetap mendukung proyek lama yang hanya menyimpan satu snapshot canvas.
  const restoreCanvas = useCallback(async (snapshot, preferredSide = 'front') => {
    const isMultiSideSnapshot = snapshot?.schemaVersion === 2

    if (
      !snapshot ||
      (isMultiSideSnapshot
        ? !snapshot.sides || typeof snapshot.sides !== 'object'
        : !Array.isArray(snapshot.objects))
    ) {
      throw new Error('Data proyek tidak valid atau kanvas belum siap.')
    }

    const requestedSide = preferredSide === 'back' ? 'back' : 'front'

    if (isMultiSideSnapshot) {
      sideSnapshotsRef.current = {
        front: snapshot.sides.front || null,
        back: snapshot.sides.back || null,
      }
      activeSideRef.current = requestedSide
    } else {
      sideSnapshotsRef.current = { front: null, back: null }
      sideSnapshotsRef.current[requestedSide] = snapshot
      activeSideRef.current = requestedSide
    }

    await applyCanvasSnapshot(sideSnapshotsRef.current[activeSideRef.current])
  }, [applyCanvasSnapshot])

  const switchDesignSide = useCallback(async (nextSide, printAreaData) => {
    if (nextSide !== 'front' && nextSide !== 'back') {
      throw new Error('Sisi desain tidak dikenal.')
    }

    if (isSwitchingSideRef.current) return false

    if (nextSide === activeSideRef.current) {
      if (printAreaData) setPrintArea(printAreaData)
      return true
    }

    const previousSide = activeSideRef.current
    let previousSnapshot = null
    isSwitchingSideRef.current = true

    try {
      previousSnapshot = await serializeCurrentCanvas()
      sideSnapshotsRef.current = {
        ...sideSnapshotsRef.current,
        [previousSide]: previousSnapshot,
      }

      activeSideRef.current = nextSide
      await applyCanvasSnapshot(sideSnapshotsRef.current[nextSide])

      if (printAreaData) setPrintArea(printAreaData)
      return true
    } catch (error) {
      // Jika pemuatan sisi tujuan gagal, kembalikan canvas ke sisi sebelumnya.
      if (previousSnapshot) {
        activeSideRef.current = previousSide
        sideSnapshotsRef.current = {
          ...sideSnapshotsRef.current,
          [previousSide]: previousSnapshot,
        }
        await applyCanvasSnapshot(previousSnapshot)
      }

      throw error
    } finally {
      isSwitchingSideRef.current = false
    }
  }, [applyCanvasSnapshot, serializeCurrentCanvas, setPrintArea])

  const resetSideDesigns = useCallback(async (frontPrintArea) => {
    sideSnapshotsRef.current = { front: null, back: null }
    activeSideRef.current = 'front'
    await applyCanvasSnapshot(null)

    if (frontPrintArea) setPrintArea(frontPrintArea)
  }, [applyCanvasSnapshot, setPrintArea])

  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const analysisCacheRef = useRef(new Map())
  const lastAnalyzedObjectIdRef = useRef(null)

  const applyRecommendedPlacement = useCallback((customPlacement = null, preferredEditorId = null) => {
    const canvas = canvasRef.current
    if (!canvas) {
      throw new Error('Kanvas desain belum siap.')
    }

    const placement = customPlacement || analysis?.recommendations?.placement
    if (!placement) {
      throw new Error('Belum ada rekomendasi penempatan AI yang tersedia.')
    }

    const active = canvas.getActiveObject()
    const allImages = canvas
      .getObjects()
      .filter((item) => !item.isPrintBoundary && String(item.type || '').toLowerCase() === 'image')

    const lookupId = preferredEditorId || lastAnalyzedObjectIdRef.current
    const targetImage =
      (lookupId && allImages.find((item) => item.editorId === lookupId)) ||
      (active && String(active.type || '').toLowerCase() === 'image' ? active : null) ||
      allImages[0] ||
      null

    if (!targetImage || !targetImage.width || !targetImage.height) {
      throw new Error('Tambahkan atau pilih objek gambar pada kanvas untuk menerapkan rekomendasi.')
    }

    const printArea = printAreaRef.current
    const widthPercent = Math.min(92, Math.max(12, Number(placement.width_percent) || 50))
    const posXPercent = Math.min(88, Math.max(12, Number(placement.position_x_percent) || 50))
    const posYPercent = Math.min(88, Math.max(12, Number(placement.position_y_percent) || 35))

    const desiredWidth = (widthPercent / 100) * printArea.width
    const maxAllowedHeight = printArea.height * 0.92
    const scaleByWidth = desiredWidth / targetImage.width
    const scaleByHeight = maxAllowedHeight / targetImage.height
    const nextScale = Math.min(scaleByWidth, scaleByHeight)

    const scaledWidth = targetImage.width * nextScale
    const scaledHeight = targetImage.height * nextScale

    const rawCenterX = printArea.left + (posXPercent / 100) * printArea.width
    const rawCenterY = printArea.top + (posYPercent / 100) * printArea.height

    const minCenterX = printArea.left + scaledWidth / 2
    const maxCenterX = printArea.left + printArea.width - scaledWidth / 2
    const minCenterY = printArea.top + scaledHeight / 2
    const maxCenterY = printArea.top + printArea.height - scaledHeight / 2

    const clampedCenterX =
      minCenterX <= maxCenterX
        ? Math.min(maxCenterX, Math.max(minCenterX, rawCenterX))
        : printArea.left + printArea.width / 2

    const clampedCenterY =
      minCenterY <= maxCenterY
        ? Math.min(maxCenterY, Math.max(minCenterY, rawCenterY))
        : printArea.top + printArea.height / 2

    targetImage.set({
      originX: 'center',
      originY: 'center',
      left: clampedCenterX,
      top: clampedCenterY,
      scaleX: nextScale,
      scaleY: nextScale,
      angle: 0,
    })

    targetImage.setCoords()
    canvas.setActiveObject(targetImage)
    canvas.requestRenderAll()

    syncSelectedObject(targetImage)
    refreshLayers()
    refreshDesignPreview()

    return {
      area: placement.area,
      position_code: placement.position_code,
      position_x_percent: posXPercent,
      position_y_percent: posYPercent,
      width_percent: widthPercent,
      left: Math.round(clampedCenterX),
      top: Math.round(clampedCenterY),
      width: Math.round(scaledWidth),
      height: Math.round(scaledHeight),
    }
  }, [analysis, refreshDesignPreview, refreshLayers, syncSelectedObject])

  const analyzeSelectedImage = useCallback(async (options = {}) => {
    const canvas = canvasRef.current
    if (!canvas) {
      throw new Error('Kanvas desain belum siap.')
    }

    const active = canvas.getActiveObject()
    const targetImage =
      active && String(active.type || '').toLowerCase() === 'image'
        ? active
        : canvas
            .getObjects()
            .find((item) => !item.isPrintBoundary && String(item.type || '').toLowerCase() === 'image')

    if (!targetImage || typeof targetImage.getElement !== 'function') {
      throw new Error('Unggah atau pilih objek gambar terlebih dahulu untuk dianalisis.')
    }

    if (active !== targetImage) {
      canvas.setActiveObject(targetImage)
      canvas.requestRenderAll()
      syncSelectedObject(targetImage)
    }

    const {
      forceRefresh = false,
      autoApply = true,
      shirtType = 'tshirt',
      currentSide = activeSideRef.current,
      currentColor = '#ffffff',
    } = options

    const objectEditorId = targetImage.editorId || null
    lastAnalyzedObjectIdRef.current = objectEditorId
    const cacheKey = objectEditorId ? `${objectEditorId}:${currentSide}` : null

    if (!forceRefresh && cacheKey && analysisCacheRef.current.has(cacheKey)) {
      const cachedResult = analysisCacheRef.current.get(cacheKey)
      setAnalysisError('')
      setAnalysis(cachedResult)
      if (autoApply && cachedResult?.recommendations?.placement) {
        applyRecommendedPlacement(cachedResult.recommendations.placement, objectEditorId)
      }
      return cachedResult
    }

    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysis(null)

    try {
      const source = targetImage.getElement()
      const rawWidth = source.naturalWidth || source.width
      const rawHeight = source.naturalHeight || source.height

      if (!rawWidth || !rawHeight) {
        throw new Error('Gambar tidak dapat dibaca oleh browser.')
      }

      // Batasi dimensi gambar analisis maksimal 1024px agar tidak memicu HTTP 413 atau timeout.
      const maxAnalysisDimension = 1024
      const scale = Math.min(
        maxAnalysisDimension / rawWidth,
        maxAnalysisDimension / rawHeight,
        1
      )
      const targetWidth = Math.max(1, Math.round(rawWidth * scale))
      const targetHeight = Math.max(1, Math.round(rawHeight * scale))

      const imageCanvas = document.createElement('canvas')
      imageCanvas.width = targetWidth
      imageCanvas.height = targetHeight

      const context = imageCanvas.getContext('2d')
      if (!context) {
        throw new Error('Browser tidak dapat menyiapkan gambar untuk analisis.')
      }

      context.drawImage(source, 0, 0, targetWidth, targetHeight)

      const blob = await new Promise((resolve) => imageCanvas.toBlob(resolve, 'image/png'))

      if (!blob) {
        throw new Error('Gagal menyiapkan gambar untuk analisis.')
      }

      const formData = new FormData()
      formData.append('image', blob, 'design-analysis.png')
      formData.append('shirt_type', String(shirtType || 'tshirt'))
      formData.append('current_side', String(currentSide || activeSideRef.current || 'front'))
      formData.append('current_color', String(currentColor || '#ffffff'))

      const response = await api.post('/designs/analyze', formData)
      const result = response.data.data

      if (cacheKey && result) {
        analysisCacheRef.current.set(cacheKey, result)
      }

      setAnalysis(result)

      if (autoApply && result?.recommendations?.placement) {
        applyRecommendedPlacement(result.recommendations.placement, objectEditorId)
      }

      return result
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Analisis AI gagal.'
      setAnalysisError(message)
      throw new Error(message, { cause: error })
    } finally {
      setIsAnalyzing(false)
    }
  }, [applyRecommendedPlacement, syncSelectedObject])

  const exportDesign = useCallback(async (options = {}) => {
    const canvas = canvasRef.current

    if (!canvas) {
      throw new Error('Kanvas desain belum siap.')
    }

    const { printArea, shirtName = 'desain', side = 'front' } = options
    const physicalWidthCm = Number(printArea?.physical_width_cm)
    const physicalHeightCm = Number(printArea?.physical_height_cm)
    const dpi = Number(printArea?.dpi) || 300

    if (
      !Number.isFinite(physicalWidthCm) ||
      !Number.isFinite(physicalHeightCm) ||
      physicalWidthCm <= 0 ||
      physicalHeightCm <= 0
    ) {
      throw new Error('Informasi ukuran fisik area cetak belum tersedia untuk produk ini.')
    }

    if (!Number.isFinite(dpi) || dpi < 72 || dpi > 600) {
      throw new Error('DPI ekspor harus berada di antara 72 dan 600.')
    }

    const designObjects = canvas.getObjects().filter((object) => !object.isPrintBoundary)

    if (designObjects.length === 0) {
      throw new Error('Tambahkan gambar atau teks sebelum mengekspor desain.')
    }

    const { left, top, width, height } = printAreaRef.current
    const pixelWidth = Math.round((physicalWidthCm / 2.54) * dpi)
    const pixelHeight = Math.round((physicalHeightCm / 2.54) * dpi)
    const totalPixels = pixelWidth * pixelHeight

    // Hindari alokasi canvas yang terlalu besar dan berisiko membuat tab browser kehabisan memori.
    if (pixelWidth > 10000 || pixelHeight > 10000 || totalPixels > 40000000) {
      throw new Error(
        'Resolusi ekspor terlalu besar untuk browser ini. Gunakan DPI maksimal 300 atau kurangi ukuran cetak.'
      )
    }

    const clippingWarnings = designObjects.filter((object) => {
      const bounds = object.getBoundingRect()

      return (
        bounds.left < left ||
        bounds.top < top ||
        bounds.left + bounds.width > left + width ||
        bounds.top + bounds.height > top + height
      )
    })

    const previousBackground = canvas.backgroundColor
    const printBoundaries = canvas.getObjects().filter((object) => object.isPrintBoundary)

    try {
      canvas.backgroundColor = ''
      printBoundaries.forEach((boundary) => {
        boundary.visible = false
      })
      canvas.requestRenderAll()

      // Gunakan skala seragam berdasarkan lebar fisik; area cetak telah
      // disesuaikan ke rasio fisik agar gambar tidak tertarik atau gepeng.
      const multiplier = pixelWidth / width
      const croppedDataUrl = canvas.toDataURL({
        format: 'png',
        left,
        top,
        width,
        height,
        multiplier,
        enableRetinaScaling: false,
      })

      const sourceImage = new Image()
      sourceImage.src = croppedDataUrl
      await sourceImage.decode()

      const outputCanvas = document.createElement('canvas')
      outputCanvas.width = pixelWidth
      outputCanvas.height = pixelHeight

      const context = outputCanvas.getContext('2d')
      if (!context) {
        throw new Error('Browser tidak dapat menyiapkan kanvas ekspor.')
      }

      context.clearRect(0, 0, pixelWidth, pixelHeight)
      context.drawImage(sourceImage, 0, 0, pixelWidth, pixelHeight)

      const renderedBlob = await new Promise((resolve, reject) => {
        outputCanvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Browser gagal membuat file PNG.'))
        }, 'image/png')
      })

      const finalBlob = await addPngDpiMetadata(renderedBlob, dpi)
      const safeName = String(shirtName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'desain'
      const fileName = `digital-sablon-${safeName}-${side}-${dpi}dpi-${Date.now()}.png`
      const objectUrl = URL.createObjectURL(finalBlob)

      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      return {
        fileName,
        pixelWidth,
        pixelHeight,
        physicalWidthCm,
        physicalHeightCm,
        dpi,
        warningCount: clippingWarnings.length,
      }
    } finally {
      printBoundaries.forEach((boundary) => {
        boundary.visible = true
      })
      canvas.backgroundColor = previousBackground
      canvas.requestRenderAll()
    }
  }, [])

  const resizeCanvas = useCallback((displayWidth) => {
    const canvas = canvasRef.current

    if (!canvas || !displayWidth) return

    const scale = displayWidth / EDITOR_CONFIG.width

    const displayHeight = EDITOR_CONFIG.height * scale

    // Pertahankan ukuran internal Fabric pada koordinat desain 1000 × 1200.
    // CSS scaling pada elemen kanvas akan menyesuaikan tampilan ke viewport.
    canvas.setDimensions({
      width: displayWidth,
      height: displayHeight,
    }, { cssOnly: true })

    // Hindari double scaling: jangan terapkan zoom Fabric di atas CSS scaling.
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])

    canvas.calcOffset()
    canvas.requestRenderAll()
  }, [])

return {
  canvasRef,
  selectedObject,
  layers,
  analysis,
  designPreview,
  designPreviewVersion,
  setPrintArea,
  serializeCanvas,
  restoreCanvas,
  switchDesignSide,
  resetSideDesigns,
  isAnalyzing,
  analysisError,
  analyzeSelectedImage,
  applyRecommendedPlacement,
  uploadImage,
  addText,
  deleteSelected,
  rotateSelected,
  moveLayer,
  selectLayer,
  updateProperty,
  exportDesign,
  resizeCanvas,
}
}