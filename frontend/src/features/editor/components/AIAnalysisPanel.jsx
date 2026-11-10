import { useState } from 'react'

function parseHexToRgb(hex) {
  const cleaned = String(hex || '').replace('#', '').trim()
  if (cleaned.length !== 6) return null
  const num = Number.parseInt(cleaned, 16)
  if (Number.isNaN(num)) return null
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function findClosestProductColor(targetHex, colorOptions = []) {
  if (!Array.isArray(colorOptions) || colorOptions.length === 0) return null
  const targetRgb = parseHexToRgb(targetHex)
  if (!targetRgb) return colorOptions[0]

  let bestOption = colorOptions[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const option of colorOptions) {
    const rgb = parseHexToRgb(option.colorHex)
    if (!rgb) continue
    const dist =
      (targetRgb.r - rgb.r) ** 2 +
      (targetRgb.g - rgb.g) ** 2 +
      (targetRgb.b - rgb.b) ** 2
    if (dist < bestDistance) {
      bestDistance = dist
      bestOption = option
    }
  }

  return bestOption
}

export default function AIAnalysisPanel({ editor, productContext = {} }) {
  const analysis = editor.analysis
  const recommendations = analysis?.recommendations
  const [placementFeedback, setPlacementFeedback] = useState('')
  const [activeOptionCode, setActiveOptionCode] = useState('')

  const handleApplyPlacement = (customPlacement = null) => {
    setPlacementFeedback('')
    try {
      const targetPlacement = customPlacement || recommendations?.placement
      const applied = editor.applyRecommendedPlacement(targetPlacement)
      setActiveOptionCode(applied.position_code || targetPlacement?.position_code || 'primary')
      setPlacementFeedback(
        `Diterapkan: ${applied.area || 'Rekomendasi AI'} → Posisi (${applied.left}, ${applied.top}), Ukuran ${applied.width}×${applied.height} px`
      )
    } catch (error) {
      setPlacementFeedback(error.message || 'Gagal menerapkan rekomendasi penempatan.')
    }
  }

  const handleApplyRecommendedColor = (recommendedColor) => {
    if (typeof productContext.onSelectColor !== 'function') return
    const closest = findClosestProductColor(
      recommendedColor.hex,
      productContext.colorOptions
    )
    if (closest) {
      productContext.onSelectColor(closest.colorHex)
      setPlacementFeedback(
        `Warna kaos diubah ke varian terdekat: ${closest.colorName} (${closest.colorHex}).`
      )
    }
  }

  const handleReanalyze = async () => {
    setPlacementFeedback('')
    setActiveOptionCode('')
    try {
      const result = await editor.analyzeSelectedImage({
        forceRefresh: true,
        autoApply: true,
        shirtType: productContext.shirtType,
        currentSide: productContext.selectedSide,
        currentColor: productContext.selectedColor,
        projectId: productContext.projectId,
      })
      if (result?.recommendations?.placement) {
        setActiveOptionCode(result.recommendations.placement.position_code || 'primary')
        setPlacementFeedback(
          `Rekomendasi utama (${result.recommendations.placement.area}) otomatis diterapkan ke kanvas.`
        )
      }
    } catch {
      // Pesan error sudah dikelola oleh state analysisError di useDesignEditor.
    }
  }

  const placementOptions = Array.isArray(recommendations?.placement_options)
    ? recommendations.placement_options
    : recommendations?.placement
      ? [recommendations.placement]
      : []

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
        Pilih gambar pada kanvas, lalu tekan <strong>✦ Analisis AI</strong> untuk menganalisis dan menempatkan desain secara proporsional.
      </p>

      {editor.isAnalyzing && (
        <p className="ai-loading">Sedang menganalisis gambar dan menghitung proporsi penempatan...</p>
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
                <div
                  className="ai-recommendation"
                  key={index}
                  style={{ cursor: productContext.onSelectColor ? 'pointer' : 'default' }}
                  onClick={() => handleApplyRecommendedColor(color)}
                  title="Klik untuk mencoba warna kaos terdekat pada Preview 3D"
                >
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
              <h4>Rekomendasi penempatan utama</h4>
              <p><strong>{recommendations.placement.area}</strong></p>
              <p>{recommendations.placement.reason}</p>
              <p className="ai-metrics">
                X: {recommendations.placement.position_x_percent}% ·{' '}
                Y: {recommendations.placement.position_y_percent}% ·{' '}
                Lebar: {recommendations.placement.width_percent}%
              </p>
              <button
                type="button"
                className="project-save-button"
                style={{ marginTop: '0.5rem', width: '100%' }}
                onClick={() => handleApplyPlacement(recommendations.placement)}
                disabled={editor.isAnalyzing}
              >
                Terapkan Rekomendasi Utama
              </button>

              {placementOptions.length > 1 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <h4>Pilihan posisi AI lainnya</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.35rem' }}>
                    {placementOptions.map((option, index) => {
                      const isPrimary = index === 0
                      const code = option.position_code || `opt-${index}`
                      const isSelected = activeOptionCode
                        ? activeOptionCode === code
                        : isPrimary

                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => handleApplyPlacement(option)}
                          disabled={editor.isAnalyzing}
                          style={{
                            textAlign: 'left',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #2563eb' : '1px solid rgba(148, 163, 184, 0.35)',
                            background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                            <span>{isPrimary ? `★ ${option.area}` : option.area}</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                              L:{option.width_percent}% · X:{option.position_x_percent}% Y:{option.position_y_percent}%
                            </span>
                          </div>
                          {option.reason && (
                            <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '0.15rem' }}>
                              {option.reason}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {placementFeedback && (
                <p className="ai-metrics" style={{ marginTop: '0.5rem', color: '#1d4ed8', fontWeight: 500 }}>
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

          <button
            type="button"
            onClick={handleReanalyze}
            disabled={editor.isAnalyzing}
            style={{ width: '100%' }}
          >
            ↻ Analisis Ulang & Terapkan Posisi
          </button>
        </div>
      )}
    </section>
  )
}
