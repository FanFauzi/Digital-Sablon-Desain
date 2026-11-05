export default function PropertiesPanel({ editor }) {
  const selected = editor.selectedObject

  if (!selected) {
    return (
      <aside className="editor-panel">
        <h3>Properties</h3>
        <p>Pilih objek pada kanvas untuk mengatur propertinya.</p>
      </aside>
    )
  }

  return (
    <aside className="editor-panel">
      <h3>Properties</h3>

      <p className="selected-name">{selected.name}</p>

      <label>
        Posisi X
        <input
          type="number"
          value={selected.left}
          onChange={(e) =>
            editor.updateProperty('left', e.target.value)
          }
        />
      </label>

      <label>
        Posisi Y
        <input
          type="number"
          value={selected.top}
          onChange={(e) =>
            editor.updateProperty('top', e.target.value)
          }
        />
      </label>

      <label>
        Lebar
        <input
          type="number"
          value={selected.width}
          onChange={(e) =>
            editor.updateProperty('width', e.target.value)
          }
        />
      </label>

      <label>
        Tinggi
        <input
          type="number"
          value={selected.height}
          onChange={(e) =>
            editor.updateProperty('height', e.target.value)
          }
        />
      </label>

      <label>
        Rotasi
        <input
          type="number"
          value={selected.angle}
          onChange={(e) =>
            editor.updateProperty('angle', e.target.value)
          }
        />
      </label>
    </aside>
  )
}