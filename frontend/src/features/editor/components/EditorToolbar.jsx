export default function EditorToolbar({ editor }) {
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