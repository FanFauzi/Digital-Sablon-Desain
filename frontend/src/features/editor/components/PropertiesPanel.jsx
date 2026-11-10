const FONT_FAMILIES = [
  'Arial',
  'Impact',
  'Georgia',
  'Courier New',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
]

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

  const type = String(selected.type || '').toLowerCase()
  const isText = type === 'i-text' || type === 'text' || type === 'textbox'

  return (
    <aside className="editor-panel">
      <h3>Properties</h3>

      <p className="selected-name">{selected.name}</p>

      {isText && (
        <>
          <label>
            Isi Teks
            <input
              type="text"
              value={selected.text ?? ''}
              onChange={(e) => editor.updateProperty('text', e.target.value)}
            />
          </label>

          <label>
            Jenis Font
            <select
              value={selected.fontFamily || 'Arial'}
              onChange={(e) => editor.updateProperty('fontFamily', e.target.value)}
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ukuran Font
            <input
              type="number"
              min="10"
              max="300"
              value={selected.fontSize ?? 65}
              onChange={(e) => editor.updateProperty('fontSize', e.target.value)}
            />
          </label>

          <label>
            Ketebalan Teks
            <select
              value={selected.fontWeight || 'bold'}
              onChange={(e) => editor.updateProperty('fontWeight', e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold (Tebal)</option>
            </select>
          </label>

          <label>
            Warna Teks
            <input
              type="color"
              value={
                typeof selected.fill === 'string' && /^#[0-9A-Fa-f]{6}$/.test(selected.fill)
                  ? selected.fill
                  : '#171717'
              }
              onChange={(e) => editor.updateProperty('fill', e.target.value)}
            />
          </label>
        </>
      )}

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