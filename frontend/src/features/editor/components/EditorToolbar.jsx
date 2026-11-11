import {
  Upload,
  Type,
  Copy,
  Undo2,
  Redo2,
  Download,
  Sparkles,
  RotateCw,
  Trash2,
} from 'lucide-react'

export default function EditorToolbar({ editor, exportOptions }) {
  const handleUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file || exportOptions?.isSwitchingSide) return

    try {
      await editor.uploadImage(file)
    } catch (error) {
      alert(error.message)
    }

    event.target.value = ''
  }

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Alat Kanvas Desain">
      <div className="toolbar-group">
        <label
          className={`tool-button-primary ${exportOptions?.isSwitchingSide ? 'disabled' : ''}`}
          title="Upload file gambar (.PNG, .JPEG, .WEBP)"
        >
          <Upload size={14} />
          <span>Upload Desain</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleUpload}
            disabled={exportOptions?.isSwitchingSide}
          />
        </label>

        <button
          type="button"
          className="tool-btn-item"
          onClick={editor.addText}
          disabled={exportOptions?.isSwitchingSide}
          title="Tambah layer teks baru ke kanvas"
        >
          <Type size={14} />
          <span>Tambah Teks</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          type="button"
          className="tool-btn-icon"
          onClick={() => editor.undo?.()}
          disabled={!editor.canUndo || exportOptions?.isSwitchingSide}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>

        <button
          type="button"
          className="tool-btn-icon"
          onClick={() => editor.redo?.()}
          disabled={!editor.canRedo || exportOptions?.isSwitchingSide}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>

        <button
          type="button"
          className="tool-btn-icon"
          onClick={() => editor.duplicateSelected?.()}
          disabled={!editor.selectedObject || exportOptions?.isSwitchingSide}
          title="Duplikat objek terpilih"
          aria-label="Duplikat Objek"
        >
          <Copy size={15} />
        </button>

        <button
          type="button"
          className="tool-btn-icon"
          onClick={() => editor.rotateSelected(90)}
          disabled={!editor.selectedObject || exportOptions?.isSwitchingSide}
          title="Putar 90 derajat searah jarum jam"
          aria-label="Putar 90 derajat"
        >
          <RotateCw size={15} />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`tool-btn-ai ${editor.isAnalyzing ? 'analyzing' : ''}`}
          disabled={exportOptions?.isSwitchingSide || editor.isAnalyzing}
          onClick={() => {
            editor
              .analyzeSelectedImage({
                shirtType: exportOptions?.shirtType,
                currentSide: exportOptions?.side,
                currentColor: exportOptions?.selectedColor,
                projectId: exportOptions?.projectId,
              })
              .catch((error) => {
                alert(error.message || 'Pilih gambar terlebih dahulu pada kanvas untuk dianalisis.')
              })
          }}
          title="Analisis kecerdasan buatan untuk proporsi, kontras, dan penempatan"
        >
          <Sparkles size={14} />
          <span>{editor.isAnalyzing ? 'Menganalisis...' : 'Analisis AI'}</span>
        </button>

        <button
          type="button"
          className="tool-btn-export"
          disabled={!exportOptions?.printArea || exportOptions?.isSwitchingSide}
          onClick={async () => {
            try {
              const result = await editor.exportDesign(exportOptions)
              const clippingMessage =
                result.warningCount > 0
                  ? `\nPeringatan: ${result.warningCount} objek berada di luar batas area cetak dan akan terpotong.`
                  : ''

              alert(
                `File cetak siap: ${result.pixelWidth} × ${result.pixelHeight} px\n` +
                  `${result.physicalWidthCm} × ${result.physicalHeightCm} cm @ ${result.dpi} DPI` +
                  clippingMessage
              )
            } catch (error) {
              alert(error.message || 'Gagal mengekspor desain.')
            }
          }}
          title="Ekspor file transparan 300 DPI siap cetak"
        >
          <Download size={14} />
          <span>Export PNG (300 DPI)</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group delete-group">
        <button
          type="button"
          className="tool-btn-delete"
          onClick={editor.deleteSelected}
          disabled={!editor.selectedObject || exportOptions?.isSwitchingSide}
          title="Hapus objek yang sedang dipilih dari kanvas"
        >
          <Trash2 size={14} />
          <span>Hapus</span>
        </button>
      </div>
    </div>
  )
}
