import { useState } from 'react'
import { Sparkles, Check, AlertTriangle, RefreshCw } from 'lucide-react'

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
        `Warna kain disesuaikan ke varian terdekat: ${closest.colorName} (${closest.colorHex}).`
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
      // Handled by useDesignEditor
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
          <span className="eyebrow">AI DESIGN ADVISOR</span>
          <h3>Rekomendasi Cerdas</h3>
        </div>
        <span className="ai-status-pill">
          <Sparkles size={12} /> GEMINI
        </span>
      </div>

      <p className="ai-panel-help">
        Pilih gambar pada kanvas lalu klik <strong>Analisis AI</strong> di toolbar untuk rekomendasi
        proporsi, kontras, dan penempatan presisi.
      </p>

      {editor.isAnalyzing && (
        <div className="ai-loading-box">
          <RefreshCw size={14} className="spin-icon" />
          <span>Menganalisis komposisi gambar dan menghitung proporsi cetak...</span>
        </div>
      )}

      {editor.analysisError && (
        <div className="ai-error-box" role="alert">
          <AlertTriangle size={14} />
          <span>{editor.analysisError}</span>
        </div>
      )}

      {analysis && (
        <div className="ai-results-editorial">
          {/* Summary */}
          <div className="ai-section-item">
            <span className="ai-item-label">Ringkasan Desain</span>
            <p className="ai-summary-text">{analysis.summary}</p>
          </div>

          {/* Dominant Colors */}
          {analysis.dominant_colors?.length > 0 && (
            <div className="ai-section-item">
              <span className="ai-item-label">Palet Warna Terdeteksi</span>
              <div className="ai-color-list">
                {analysis.dominant_colors.map((color, index) => (
                  <span className="ai-color-chip" key={index}>
                    <span className="chip-swatch" style={{ backgroundColor: color.hex }} />
                    <span className="chip-name">{color.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Color Match Suggestions */}
          {recommendations?.shirt_colors?.length > 0 && (
            <div className="ai-section-item">
              <span className="ai-item-label">Kesesuaian Warna Kaos</span>
              <div className="ai-color-recs">
                {recommendations.shirt_colors.map((color, index) => (
                  <button
                    type="button"
                    className="ai-color-rec-card"
                    key={index}
                    onClick={() => handleApplyRecommendedColor(color)}
                    title="Klik untuk menerapkan varian warna ini pada model 3D"
                  >
                    <span className="rec-swatch" style={{ backgroundColor: color.hex }} />
                    <div className="rec-text">
                      <strong>{color.name}</strong>
                      <p>{color.reason}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Placement Recommendation */}
          {recommendations?.placement && (
            <div className="ai-section-item">
              <span className="ai-item-label">Rekomendasi Penempatan</span>
              <div className="ai-primary-placement-card">
                <div className="placement-header">
                  <strong>{recommendations.placement.area}</strong>
                  <span className="placement-spec">
                    Lebar: {recommendations.placement.width_percent}% · Posisi ({recommendations.placement.position_x_percent}%, {recommendations.placement.position_y_percent}%)
                  </span>
                </div>
                <p className="placement-reason">{recommendations.placement.reason}</p>

                <button
                  type="button"
                  className="btn-apply-placement"
                  onClick={() => handleApplyPlacement(recommendations.placement)}
                  disabled={editor.isAnalyzing}
                >
                  <Check size={14} />
                  <span>Terapkan Rekomendasi Utama</span>
                </button>
              </div>

              {/* Alternative Placements */}
              {placementOptions.length > 1 && (
                <div className="placement-alternatives">
                  <span className="alt-label">Pilihan Posisi Alternatif:</span>
                  <div className="alt-buttons-stack">
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
                          className={`alt-pos-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => handleApplyPlacement(option)}
                          disabled={editor.isAnalyzing}
                        >
                          <div className="alt-pos-header">
                            <span>{isPrimary ? `★ ${option.area}` : option.area}</span>
                            <span className="alt-pos-dim">L: {option.width_percent}%</span>
                          </div>
                          {option.reason && <p className="alt-pos-desc">{option.reason}</p>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {placementFeedback && (
                <div className="ai-feedback-banner">
                  <Check size={13} />
                  <span>{placementFeedback}</span>
                </div>
              )}
            </div>
          )}

          {/* Production Warnings */}
          {recommendations?.warnings?.length > 0 && (
            <div className="ai-warning-box">
              <div className="warning-title-row">
                <AlertTriangle size={14} />
                <strong>Catatan Produksi & Batas Cetak</strong>
              </div>
              <ul>
                {recommendations.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-analyze Button */}
          <button
            type="button"
            className="btn-ai-reanalyze"
            onClick={handleReanalyze}
            disabled={editor.isAnalyzing}
          >
            <RefreshCw size={13} />
            <span>Analisis Ulang & Perbarui Posisi</span>
          </button>
        </div>
      )}
    </section>
  )
}
