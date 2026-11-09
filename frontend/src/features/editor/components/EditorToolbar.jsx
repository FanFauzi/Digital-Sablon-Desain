export default function EditorToolbar({ editor, exportOptions }) {
  const handleUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      await editor.uploadImage(file)
    } catch (error) {
      alert(error.message)
    }

    event.target.value = ''
  }

  return (
    <div className="editor-toolbar">
      <label className="tool-button">
        + Upload Desain
        <input
          type="file"
          accept="image/png,image/jpeg"
          hidden
          onChange={handleUpload}
        />
      </label>

      <button onClick={editor.addText}>
        + Tambah Teks
      </button>

      <button
        type="button"
        disabled={!exportOptions?.printArea}
        onClick={async () => {
          try {
            const result = await editor.exportDesign(exportOptions)
            const clippingMessage = result.warningCount > 0
              ? `\\nPeringatan: ${result.warningCount} objek berada di luar batas area cetak dan akan terpotong.`
              : ''

            alert(
              `PNG siap diunduh: ${result.pixelWidth} × ${result.pixelHeight} px\\n` +
              `${result.physicalWidthCm} × ${result.physicalHeightCm} cm @ ${result.dpi} DPI` +
              clippingMessage
            )
          } catch (error) {
            alert(error.message || 'Gagal mengekspor desain.')
          }
        }}
      >
        ↓ Export PNG 300 DPI
      </button>

      <button
        type="button"
        className="ai-analysis-button"
        onClick={() => {
          editor.analyzeSelectedImage().catch((error) => {
            alert(error.message || 'Pilih gambar terlebih dahulu untuk dianalisis.')
          })
        }}
      >
        {editor.isAnalyzing ? 'Menganalisis...' : '✦ Analisis AI'}
      </button>

      <button
        onClick={() => editor.rotateSelected(90)}
        disabled={!editor.selectedObject}
      >
        ↻ Rotate 90°
      </button>

      <button
        className="delete-button"
        onClick={editor.deleteSelected}
        disabled={!editor.selectedObject}
      >
        Hapus Objek
      </button>
    </div>
  )
}