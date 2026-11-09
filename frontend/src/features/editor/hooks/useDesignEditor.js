import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  IText,
  Rect,
} from 'fabric'

import { EDITOR_CONFIG } from '../utils/editorConfig'
import api from '../../../services/api'

function createPrintBoundary() {
  const boundary = new Rect({
    left: EDITOR_CONFIG.printArea.left,
    top: EDITOR_CONFIG.printArea.top,
    width: EDITOR_CONFIG.printArea.width,
    height: EDITOR_CONFIG.printArea.height,
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

async function imageElementToDataUrl(element) {
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
  return temporaryCanvas.toDataURL('image/png')
}

export default function useDesignEditor(canvasElement) {
  const canvasRef = useRef(null)

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

  const refreshDesignPreview = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { left, top, width, height } = EDITOR_CONFIG.printArea
    const previousBackground = canvas.backgroundColor

    try {
      // Preview transparan hanya berisi desain di area cetak.
      canvas.backgroundColor = ''
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
    } finally {
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

    const boundary = createPrintBoundary()

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

      image.editorId = crypto.randomUUID()
      image.editorName = file.name

      canvas.add(image)
      canvas.setActiveObject(image)
      canvas.requestRenderAll()

      syncSelectedObject(image)
      refreshLayers()
    } finally {
      URL.revokeObjectURL(url)
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

  const serializeCanvas = useCallback(async () => {
    const canvas = canvasRef.current

    if (!canvas) {
      throw new Error('Kanvas desain belum siap untuk disimpan.')
    }

    const snapshot = canvas.toObject(['editorId', 'editorName'])
    const designObjects = canvas.getObjects()
      .filter((object) => !object.isPrintBoundary)

    snapshot.objects = await Promise.all(
      designObjects.map(async (object) => {
        const serialized = object.toObject(['editorId', 'editorName'])

        // Blob URL tidak bertahan setelah halaman ditutup. Simpan gambar
        // sebagai data URL agar proyek dapat dipulihkan setelah browser dibuka.
        if (object.type === 'image' && typeof object.getElement === 'function') {
          serialized.src = await imageElementToDataUrl(object.getElement())
          serialized.crossOrigin = undefined
        }

        return serialized
      })
    )

    return snapshot
  }, [])

  const restoreCanvas = useCallback(async (snapshot) => {
    const canvas = canvasRef.current

    if (!canvas || !snapshot || !Array.isArray(snapshot.objects)) {
      throw new Error('Data proyek tidak valid atau kanvas belum siap.')
    }

    canvas.discardActiveObject()
    canvas.clear()
    await canvas.loadFromJSON(snapshot)

    const boundary = createPrintBoundary()
    canvas.add(boundary)
    canvas.sendObjectToBack(boundary)
    canvas.backgroundColor = '#ffffff'
    canvas.requestRenderAll()

    setSelectedObject(null)
    refreshLayers()
    refreshDesignPreview()
  }, [refreshDesignPreview, refreshLayers])

  const [analysis, setAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  const analyzeSelectedImage = useCallback(async () => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()

    if (!active || active.type !== 'image' || typeof active.getElement !== 'function') {
      throw new Error('Pilih objek gambar terlebih dahulu untuk dianalisis.')
    }

    setIsAnalyzing(true)
    setAnalysisError('')
    setAnalysis(null)

    try {
      const source = active.getElement()
      const imageCanvas = document.createElement('canvas')
      imageCanvas.width = source.naturalWidth || source.width
      imageCanvas.height = source.naturalHeight || source.height

      if (!imageCanvas.width || !imageCanvas.height) {
        throw new Error('Gambar tidak dapat dibaca oleh browser.')
      }

      const context = imageCanvas.getContext('2d')
      context.drawImage(source, 0, 0, imageCanvas.width, imageCanvas.height)

      const blob = await new Promise((resolve) => imageCanvas.toBlob(resolve, 'image/png'))

      if (!blob) {
        throw new Error('Gagal menyiapkan gambar untuk analisis.')
      }

      const formData = new FormData()
      formData.append('image', blob, 'design-analysis.png')

      const response = await api.post('/designs/analyze', formData)
      setAnalysis(response.data.data)
      return response.data.data
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Analisis AI gagal.'
      setAnalysisError(message)
      throw new Error(message, { cause: error })
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const exportDesign = useCallback(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      throw new Error('Kanvas desain belum siap.')
    }

    const { left, top, width, height } = EDITOR_CONFIG.printArea
    const previousBackground = canvas.backgroundColor

    try {
      // Hasil ekspor hanya area cetak, tanpa latar putih editor.
      canvas.backgroundColor = ''
      canvas.requestRenderAll()

      const dataUrl = canvas.toDataURL({
        format: 'png',
        left,
        top,
        width,
        height,
        multiplier: 1,
        enableRetinaScaling: false,
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `digital-sablon-desain-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
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
  serializeCanvas,
  restoreCanvas,
  isAnalyzing,
  analysisError,
  analyzeSelectedImage,
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