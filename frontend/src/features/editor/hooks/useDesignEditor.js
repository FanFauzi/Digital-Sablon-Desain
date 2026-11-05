import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  FabricText,
  Rect,
} from 'fabric'

import { EDITOR_CONFIG } from '../utils/editorConfig'

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
    })
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

    // Area cetak: persegi panjang utuh.
    const boundary = new Rect({
      left: EDITOR_CONFIG.printArea.left,
      top: EDITOR_CONFIG.printArea.top,
      width: EDITOR_CONFIG.printArea.width,
      height: EDITOR_CONFIG.printArea.height,
      fill: 'rgba(0, 0, 0, 0)',
      stroke: '#a3a3a3',
      strokeWidth: 3,
      strokeDashArray: [12, 8],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })

    boundary.isPrintBoundary = true

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

    canvas.on('object:added', refreshLayers)
    canvas.on('object:removed', refreshLayers)

    return () => {
      canvas.dispose()
      canvasRef.current = null
    }
  }, [canvasElement, refreshLayers, syncSelectedObject])

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

    const text = new FabricText('Tulis desainmu', {
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
  }, [syncSelectedObject])

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

    canvas.setActiveObject(object)
    canvas.requestRenderAll()

    syncSelectedObject(object)
    refreshLayers()
  }, [refreshLayers, syncSelectedObject])

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
  }, [syncSelectedObject])

  const resizeCanvas = useCallback((displayWidth) => {
    const canvas = canvasRef.current

    if (!canvas || !displayWidth) return

    const scale = displayWidth / EDITOR_CONFIG.width

    const displayHeight = EDITOR_CONFIG.height * scale

    // Pertahankan ukuran internal Fabric pada koordinat desain 1000 × 1200.
    // Ubah ukuran CSS wrapper saja agar koordinat objek tidak ikut berubah.
    canvas.setDimensions({
      width: displayWidth,
      height: displayHeight,
    }, { cssOnly: true })

    // Zoom Fabric mengubah tampilan sekaligus menjaga pemetaan pointer.
    canvas.setZoom(scale)

    canvas.calcOffset()
    canvas.requestRenderAll()
  }, [])

return {
  canvasRef,
  selectedObject,
  layers,
  uploadImage,
  addText,
  deleteSelected,
  rotateSelected,
  moveLayer,
  selectLayer,
  updateProperty,
  resizeCanvas,
}
}