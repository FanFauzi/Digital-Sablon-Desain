import { Layers, ArrowUp, ArrowDown } from 'lucide-react'

export default function LayerPanel({ editor }) {
  const selectedId = editor.selectedObject?.id

  return (
    <aside className="editor-panel layer-panel">
      <div className="panel-header">
        <span className="eyebrow">HIERARCHY</span>
        <div className="panel-title-row">
          <h3>Susunan Layer</h3>
          <span className="layer-count-badge">{editor.layers.length} Objek</span>
        </div>
      </div>

      {editor.layers.length === 0 ? (
        <div className="panel-empty-placeholder">
          <Layers size={22} className="placeholder-icon" />
          <p>Belum ada objek. Tambahkan gambar atau teks untuk mulai mengelola layer.</p>
        </div>
      ) : (
        <div className="layer-stack-list">
          {editor.layers.map((layer, index) => {
            const isSelected = selectedId === layer.id
            return (
              <div
                className={`layer-item ${isSelected ? 'active' : ''}`}
                key={layer.id}
              >
                <button
                  type="button"
                  className="layer-select-btn"
                  onClick={() => editor.selectLayer(layer.id)}
                  title={`Pilih ${layer.name}`}
                >
                  <span className="layer-index">{index + 1}</span>
                  <span className="layer-name-text">{layer.name}</span>
                </button>

                <div className="layer-order-actions">
                  <button
                    type="button"
                    className="layer-arrow-btn"
                    title="Naikkan urutan layer"
                    onClick={() => editor.moveLayer(layer.id, 'up')}
                    aria-label="Naikkan layer"
                  >
                    <ArrowUp size={12} />
                  </button>

                  <button
                    type="button"
                    className="layer-arrow-btn"
                    title="Turunkan urutan layer"
                    onClick={() => editor.moveLayer(layer.id, 'down')}
                    aria-label="Turunkan layer"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}
