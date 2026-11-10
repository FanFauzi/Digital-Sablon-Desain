import { useState } from 'react'

export default function AIAnalysisPanel({ editor }) {
  const analysis = editor.analysis
  const recommendations = analysis?.recommendations
  const [placementFeedback, setPlacementFeedback] = useState('')

  const handleApplyPlacement = () => {
    setPlacementFeedback('')
    try {
      editor.applyRecommendedPlacement()
      setPlacementFeedback('Posisi & skala rekomendasi berhasil diterapkan ke kanvas.')
    } catch (error) {
      setPlacementFeedback(error.message || 'Gagal menerapkan rekomendasi penempatan.')
    }
  }

  const handleReanalyze = async () => {
    setPlacementFeedback('')
    try {
      await editor.analyzeSelectedImage({ forceRefresh: true })
    } catch {
      // Pesan error sudah dikelola oleh state analysisError di useDesignEditor.
    }
  }

  return (
    <section className="editor-panel ai-analysis-panel">
      <div className="ai-panel-heading">
        <div>
          <span className="eyebrow">GEMINI MULTIMODAL</span>
          <h3>AI Design Analysis</h3>
        </div>
        <span className="ai-status">AI</span>
      </div>

      <p className="ai-panel-help">
        Pilih gambar pada kanvas, lalu tekan Analisis AI untuk mendapatkan rekomendasi.
      </p>

      {editor.isAnalyzing && (
        <p className="ai-loading">Sedang menganalisis gambar. Proses ini dapat memerlukan beberapa detik...</p>
      )}

      {editor.analysisError && (
        <p className="ai-error" role="alert">{editor.analysisError}</p>
      )}

      {analysis && (
        <div className="ai-results">
          <div>
            <h4>Ringkasan desain</h4>
            <p>{analysis.summary}</p>
          </div>

          {analysis.objects?.length > 0 && (
            <div>
              <h4>Objek terdeteksi</h4>
              <ul>
                {analysis.objects.map((item, index) => (
                  <li key={index}>
                    <strong>{item.name}</strong>: {item.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.dominant_colors?.length > 0 && (
            <div>
              <h4>Warna dominan</h4>
              <div className="ai-color-list">
                {analysis.dominant_colors.map((color, index) => (
                  <span className="ai-color" key={index}>
                    <i style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recommendations?.shirt_colors?.length > 0 && (
            <div>
              <h4>Rekomendasi warna kaos</h4>
              {recommendations.shirt_colors.map((color, index) => (
                <div className="ai-recommendation" key={index}>
                  <span className="ai-swatch" style={{ backgroundColor: color.hex }} />
                  <div>
                    <strong>{color.name}</strong>
                    <p>{color.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recommendations?.placement && (
            <div>
              <h4>Rekomendasi penempatan</h4>
              <p><strong>{recommendations.placement.area}</strong></p>
              <p>{recommendations.placement.reason}</p>
              <p className="ai-metrics">
                X: {recommendations.placement.position_x_percent}% ·
                Y: {recommendations.placement.position_y_percent}% ·
                Lebar: {recommendations.placement.width_percent}%
              </p>
              <button
                type="button"
                className="project-save-button"
                style={{ marginTop: '0.5rem', width: '100%' }}
                onClick={handleApplyPlacement}
                disabled={editor.isAnalyzing}
              >
                Terapkan Penempatan ke Kanvas
              </button>
              {placementFeedback && (
                <p className="ai-metrics" style={{ marginTop: '0.35rem' }}>
                  {placementFeedback}
                </p>
              )}
            </div>
          )}

          {recommendations?.print_method && (
            <div>
              <h4>Rekomendasi metode cetak</h4>
              <p><strong>{recommendations.print_method.method}</strong></p>
              <p>{recommendations.print_method.reason}</p>
            </div>
          )}

          {recommendations?.warnings?.length > 0 && (
            <div className="ai-warning">
              <h4>Catatan produksi</h4>
              <ul>
                {recommendations.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.confidence && (
            <p className="ai-confidence">
              Tingkat keyakinan AI: <strong>{analysis.confidence.score}/100</strong>
              <br />{analysis.confidence.explanation}
            </p>
          )}

          {editor.selectedObject?.type === 'image' && (
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={editor.isAnalyzing}
              style={{ width: '100%' }}
            >
              Analisis Ulang Gambar Ini
            </button>
          )}
        </div>
      )}
    </section>
  )
}
