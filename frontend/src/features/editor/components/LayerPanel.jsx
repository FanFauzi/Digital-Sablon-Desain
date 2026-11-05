export default function LayerPanel({ editor }) {
  return (
    <aside className="editor-panel">
      <h3>Layers</h3>

      {editor.layers.length === 0 && (
        <p>Belum ada objek desain.</p>
      )}

      {editor.layers.map((layer) => (
        <div className="layer-item" key={layer.id}>
          <button
            className="layer-name"
            onClick={() => editor.selectLayer(layer.id)}
          >
            {layer.name}
          </button>

          <button
            title="Naikkan layer"
            onClick={() => editor.moveLayer(layer.id, 'up')}
          >
            ↑
          </button>

          <button
            title="Turunkan layer"
            onClick={() => editor.moveLayer(layer.id, 'down')}
          >
            ↓
          </button>
        </div>
      ))}
    </aside>
  )
}