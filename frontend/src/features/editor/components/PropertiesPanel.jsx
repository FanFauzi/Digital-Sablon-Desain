import { Sliders, Copy, RotateCw, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'

const FONT_FAMILIES = [
  'Arial',
  'Space Grotesk',
  'Inter',
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
      <aside className="editor-panel properties-panel">
        <div className="panel-header">
          <span className="eyebrow">INSPECTOR</span>
          <h3>Properti Objek</h3>
        </div>
        <div className="panel-empty-placeholder">
          <Sliders size={24} className="placeholder-icon" />
          <p>Pilih objek gambar atau teks pada kanvas untuk mengatur posisi, ukuran, dan tampilannya.</p>
        </div>
      </aside>
    )
  }

  const type = String(selected.type || '').toLowerCase()
  const isText = type === 'i-text' || type === 'text' || type === 'textbox'

  return (
    <aside className="editor-panel properties-panel">
      <div className="panel-header">
        <span className="eyebrow">INSPECTOR</span>
        <div className="panel-title-row">
          <h3>Properti Objek</h3>
          <span className="selected-type-badge">{type.toUpperCase()}</span>
        </div>
        <p className="selected-name-label">{selected.name || 'Objek Terpilih'}</p>
      </div>

      {isText && (
        <div className="props-text-group">
          <label className="prop-field">
            <span className="prop-label">Isi Teks</span>
            <input
              type="text"
              className="prop-input"
              value={selected.text ?? ''}
              onChange={(e) => editor.updateProperty('text', e.target.value)}
            />
          </label>

          <label className="prop-field">
            <span className="prop-label">Jenis Font</span>
            <select
              className="prop-select"
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

          <div className="prop-row-two">
            <label className="prop-field">
              <span className="prop-label">Ukuran Font</span>
              <input
                type="number"
                className="prop-input"
                min="10"
                max="300"
                value={selected.fontSize ?? 65}
                onChange={(e) => editor.updateProperty('fontSize', e.target.value)}
              />
            </label>

            <label className="prop-field">
              <span className="prop-label">Ketebalan</span>
              <select
                className="prop-select"
                value={selected.fontWeight || 'bold'}
                onChange={(e) => editor.updateProperty('fontWeight', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold (Tebal)</option>
              </select>
            </label>
          </div>

          <label className="prop-field">
            <span className="prop-label">Warna Teks</span>
            <div className="color-input-wrap">
              <input
                type="color"
                className="prop-color-picker"
                value={
                  typeof selected.fill === 'string' && /^#[0-9A-Fa-f]{6}$/.test(selected.fill)
                    ? selected.fill
                    : '#171717'
                }
                onChange={(e) => editor.updateProperty('fill', e.target.value)}
              />
              <span className="color-hex-label">{selected.fill || '#171717'}</span>
            </div>
          </label>
        </div>
      )}

      {/* Geometry: 2-column clean grid */}
      <div className="props-geo-group">
        <span className="props-section-subtitle">Posisi & Dimensi (px)</span>
        <div className="prop-row-two">
          <label className="prop-field">
            <span className="prop-label">Posisi X</span>
            <input
              type="number"
              className="prop-input"
              value={selected.left}
              onChange={(e) => editor.updateProperty('left', e.target.value)}
            />
          </label>

          <label className="prop-field">
            <span className="prop-label">Posisi Y</span>
            <input
              type="number"
              className="prop-input"
              value={selected.top}
              onChange={(e) => editor.updateProperty('top', e.target.value)}
            />
          </label>
        </div>

        <div className="prop-row-two">
          <label className="prop-field">
            <span className="prop-label">Lebar</span>
            <input
              type="number"
              className="prop-input"
              value={selected.width}
              onChange={(e) => editor.updateProperty('width', e.target.value)}
            />
          </label>

          <label className="prop-field">
            <span className="prop-label">Tinggi</span>
            <input
              type="number"
              className="prop-input"
              value={selected.height}
              onChange={(e) => editor.updateProperty('height', e.target.value)}
            />
          </label>
        </div>

        <div className="prop-row-two">
          <label className="prop-field">
            <span className="prop-label">Rotasi (°)</span>
            <input
              type="number"
              className="prop-input"
              value={selected.angle}
              onChange={(e) => editor.updateProperty('angle', e.target.value)}
            />
          </label>

          <label className="prop-field">
            <span className="prop-label">Opacity ({selected.opacity ?? 100}%)</span>
            <input
              type="range"
              className="prop-range"
              min="10"
              max="100"
              value={selected.opacity ?? 100}
              onChange={(e) => editor.updateProperty('opacity', e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="properties-quick-actions">
        <button
          type="button"
          onClick={() => editor.duplicateSelected?.()}
          title="Duplikat objek"
        >
          <Copy size={12} />
          <span>Duplikat</span>
        </button>
        <button
          type="button"
          onClick={() => editor.rotateSelected(90)}
          title="Putar 90 derajat"
        >
          <RotateCw size={12} />
          <span>Putar 90°</span>
        </button>
        <button
          type="button"
          onClick={() => editor.moveLayer(selected.id, 'up')}
          title="Bawa maju satu layer"
        >
          <ArrowUp size={12} />
          <span>Maju</span>
        </button>
        <button
          type="button"
          onClick={() => editor.moveLayer(selected.id, 'down')}
          title="Turunkan mundur satu layer"
        >
          <ArrowDown size={12} />
          <span>Mundur</span>
        </button>
        <button
          type="button"
          className="delete-button"
          onClick={editor.deleteSelected}
          title="Hapus objek dari kanvas"
        >
          <Trash2 size={12} />
          <span>Hapus Objek</span>
        </button>
      </div>
    </aside>
  )
}
