import { useRef, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import useDesignEditor from '../features/editor/hooks/useDesignEditor'
import { EDITOR_CONFIG } from '../features/editor/utils/editorConfig'
import { getShirtById } from '../services/shirtService'

import EditorToolbar from '../features/editor/components/EditorToolbar'
import PropertiesPanel from '../features/editor/components/PropertiesPanel'
import LayerPanel from '../features/editor/components/LayerPanel'
import AIAnalysisPanel from '../features/editor/components/AIAnalysisPanel'
import ShirtPreview3D from '../features/editor/components/ShirtPreview3D'

export default function EditorPage() {
  const { shirtId } = useParams()

  const canvasElement = useRef(null)
  const viewportRef = useRef(null)

  const editor = useDesignEditor(canvasElement)
  const { resizeCanvas } = editor

  const [shirt, setShirt] = useState(null)
  const [shirtLoading, setShirtLoading] = useState(true)
  const [shirtError, setShirtError] = useState('')
  const [selectedColor, setSelectedColor] = useState('#ffffff')
  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedSide, setSelectedSide] = useState('front')

  useEffect(() => {
    let isMounted = true

    const loadShirt = async () => {
      setShirtLoading(true)
      setShirtError('')

      try {
        const data = await getShirtById(shirtId)
        if (!isMounted) return

        setShirt(data)

        const firstVariant =
          data.variants?.find((variant) => variant.size === 'M') ||
          data.variants?.[0]

        if (firstVariant) {
          setSelectedColor(firstVariant.color_hex)
          setSelectedSize(firstVariant.size)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setShirtError('Detail produk gagal dimuat. Pastikan server Laravel aktif.')
        }
      } finally {
        if (isMounted) setShirtLoading(false)
      }
    }

    loadShirt()

    return () => {
      isMounted = false
    }
  }, [shirtId])

  useEffect(() => {
    const viewport = viewportRef.current

    if (!viewport) return

    const updateCanvasSize = () => {
      const availableWidth = viewport.clientWidth

      const displayWidth = Math.min(
        availableWidth,
        EDITOR_CONFIG.width
      )

      resizeCanvas(displayWidth)
    }

    const observer = new ResizeObserver(updateCanvasSize)

    observer.observe(viewport)
    updateCanvasSize()

    return () => observer.disconnect()
  }, [resizeCanvas])

  const colorOptions = [
    ...new Map(
      (shirt?.variants || []).map((variant) => [
        variant.color_hex,
        {
          colorHex: variant.color_hex,
          colorName: variant.color_name,
        },
      ])
    ).values(),
  ]

  const sizeOptions = [
    ...new Set(
      (shirt?.variants || [])
        .filter((variant) => variant.color_hex === selectedColor)
        .map((variant) => variant.size)
    ),
  ]

  const selectedVariant = shirt?.variants?.find(
    (variant) =>
      variant.color_hex === selectedColor &&
      variant.size === selectedSize
  )

  const printArea = shirt?.print_areas?.find(
    (area) => area.view_side === selectedSide
  )

  const handleColorChange = (colorHex) => {
    setSelectedColor(colorHex)

    const availableSizes = (shirt?.variants || [])
      .filter((variant) => variant.color_hex === colorHex)
      .map((variant) => variant.size)

    if (availableSizes.length > 0) {
      const nextSize = availableSizes.includes(selectedSize)
        ? selectedSize
        : availableSizes.includes('M')
          ? 'M'
          : availableSizes[0]

      setSelectedSize(nextSize)
    }
  }

  return (
    <main className="editor-page">
      <div className="editor-header">
        <div>
          <span className="eyebrow">DESIGN STUDIO</span>
          <h1>Customize Your Product</h1>
          <p>
            {shirtLoading
              ? `Memuat produk #${shirtId}...`
              : shirt
                ? shirt.name
                : `Produk ID: ${shirtId}`}
          </p>
        </div>
      </div>

      <EditorToolbar editor={editor} />

      {shirtLoading && (
        <div className="configurator-message">Memuat detail produk...</div>
      )}

      {shirtError && (
        <div className="configurator-message configurator-error" role="alert">
          {shirtError}
        </div>
      )}

      {!shirtLoading && shirt && (
        <section className="shirt-configurator">
          <div className="shirt-preview-column">
            <div className="configurator-section-heading">
              <div>
                <span className="eyebrow">LIVE PRODUCT VIEW</span>
                <h2>Preview Produk 3D</h2>
              </div>
              <span className="preview-side-label">
                {selectedSide === 'front' ? 'TAMPAK DEPAN' : 'TAMPAK BELAKANG'}
              </span>
            </div>

            <ShirtPreview3D
              color={selectedColor}
              side={selectedSide}
              productType={shirt.type}
              designPreview={editor.designPreview}
            />

            <p className="preview-product-name">
              {shirt.name} · {selectedVariant?.color_name || 'Warna belum dipilih'}
              {selectedVariant ? ` · Size ${selectedVariant.size}` : ''}
            </p>
          </div>

          <aside className="shirt-configurator-controls">
            <span className="eyebrow">PRODUCT CONFIGURATION</span>
            <h2>{shirt.name}</h2>
            <p className="product-description">
              {shirt.description || 'Pilih varian produk untuk melihat pratinjau.'}
            </p>

            <div className="config-control-group">
              <div className="config-control-label">
                <strong>Warna kaos</strong>
                <span>{colorOptions.find((item) => item.colorHex === selectedColor)?.colorName}</span>
              </div>

              <div className="shirt-color-options">
                {colorOptions.map((item) => (
                  <button
                    key={item.colorHex}
                    type="button"
                    className={`shirt-color-option ${selectedColor === item.colorHex ? 'selected' : ''}`}
                    style={{ '--swatch-color': item.colorHex }}
                    aria-label={`Pilih warna ${item.colorName}`}
                    aria-pressed={selectedColor === item.colorHex}
                    title={item.colorName}
                    onClick={() => handleColorChange(item.colorHex)}
                  />
                ))}
              </div>
            </div>

            <div className="config-control-group">
              <div className="config-control-label">
                <strong>Ukuran</strong>
                <span>{selectedSize}</span>
              </div>

              <div className="shirt-size-options">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={selectedSize === size ? 'selected' : ''}
                    aria-pressed={selectedSize === size}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="config-control-group">
              <div className="config-control-label">
                <strong>Sisi desain</strong>
              </div>

              <div className="shirt-side-options">
                <button
                  type="button"
                  className={selectedSide === 'front' ? 'selected' : ''}
                  aria-pressed={selectedSide === 'front'}
                  onClick={() => setSelectedSide('front')}
                >
                  Depan
                </button>
                <button
                  type="button"
                  className={selectedSide === 'back' ? 'selected' : ''}
                  aria-pressed={selectedSide === 'back'}
                  onClick={() => setSelectedSide('back')}
                >
                  Belakang
                </button>
              </div>
            </div>

            {printArea && (
              <div className="print-area-summary">
                <span>AREA CETAK {selectedSide === 'front' ? 'DEPAN' : 'BELAKANG'}</span>
                <strong>
                  {printArea.physical_width_cm} × {printArea.physical_height_cm} cm
                </strong>
                <small>Resolusi acuan: {printArea.dpi} DPI</small>
              </div>
            )}
          </aside>
        </section>
      )}

      <div className="editor-layout">
        <section className="editor-main">
          <div
            className="canvas-viewport"
            ref={viewportRef}
          >
            <canvas ref={canvasElement} />
          </div>

          <div className="canvas-info">
            Area desain {EDITOR_CONFIG.width} × {EDITOR_CONFIG.height} unit
          </div>
        </section>

        <aside className="editor-sidebar">
          <PropertiesPanel editor={editor} />
          <LayerPanel editor={editor} />
          <AIAnalysisPanel editor={editor} />
        </aside>
      </div>
    </main>
  )
}
