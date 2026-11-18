import { useRef } from 'react'
import useDesignEditor from '../hooks/useDesignEditor'

export default function DesignCanvas() {
  const canvasElement = useRef(null)

  const editor = useDesignEditor(canvasElement)

  return (
    <div className="design-workspace">
      <div className="canvas-frame">
        <canvas ref={canvasElement} />
      </div>

      <div className="canvas-info">
        Area desain 1000 × 1200 unit
      </div>
    </div>
  )
}