import { useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import useDesignEditor from '../features/editor/hooks/useDesignEditor'
import { EDITOR_CONFIG } from '../features/editor/utils/editorConfig'

import EditorToolbar from '../features/editor/components/EditorToolbar'
import PropertiesPanel from '../features/editor/components/PropertiesPanel'
import LayerPanel from '../features/editor/components/LayerPanel'
import AIAnalysisPanel from '../features/editor/components/AIAnalysisPanel'

export default function EditorPage() {
  const { shirtId } = useParams()

  const canvasElement = useRef(null)
  const viewportRef = useRef(null)

  const editor = useDesignEditor(canvasElement)

  useEffect(() => {
    const viewport = viewportRef.current

    if (!viewport) return

    const updateCanvasSize = () => {
      const availableWidth = viewport.clientWidth

      const displayWidth = Math.min(
        availableWidth,
        EDITOR_CONFIG.width
      )

      editor.resizeCanvas(displayWidth)
    }

    const observer = new ResizeObserver(updateCanvasSize)

    observer.observe(viewport)
    updateCanvasSize()

    return () => observer.disconnect()
  }, [editor.resizeCanvas])

  return (
    <main className="editor-page">
      <div className="editor-header">
        <div>
          <span className="eyebrow">DESIGN STUDIO</span>
          <h1>Customize Your Product</h1>
          <p>Produk ID: {shirtId}</p>
        </div>
      </div>

      <EditorToolbar editor={editor} />

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