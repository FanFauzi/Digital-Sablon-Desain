import { useState } from 'react'
import {
  BACKGROUND_PRESETS,
  FABRIC_TEXTURES,
  GARMENT_COLOR_PRESETS,
  GARMENT_MODELS,
  MOTION_MODES,
  PRINT_PLACEMENT_PRESETS,
  useConfiguratorStore,
} from '../store/configuratorStore'
import {
  export3DMockupImage,
  export3DModelGLB,
  export3DVideoWebM,
} from '../services/exportService'

const SIDEBAR_TABS = [
  { id: 'upload', icon: '⬆', label: 'Upload' },
  { id: 'artwork', icon: '❖', label: 'Artwork' },
  { id: 'color', icon: '◉', label: 'Color' },
  { id: 'background', icon: '▣', label: 'Bg' },
  { id: 'motion', icon: '↝', label: 'Motion' },
  { id: 'effects', icon: '✦', label: 'Effects' },
  { id: 'export', icon: '⬇', label: 'Export' },
]

const SIDE_OPTIONS = [
  { id: 'front', label: 'Front (Depan)' },
  { id: 'back', label: 'Back (Belakang)' },
  { id: 'left_sleeve', label: 'Left Sleeve (Lengan Kiri)' },
  { id: 'right_sleeve', label: 'Right Sleeve (Lengan Kanan)' },
]

export default function Sidebar({
  editor,
  shirt,
  selectedColor,
  selectedSize,
  selectedSide,
  colorOptions = [],
  sizeOptions = [],
  printArea,
  isSwitchingSide,
  activeProjectId,
  onColorChange,
  onSizeChange,
  onSideChange,
  sceneContextRef,
}) {
  const activeTab = useConfiguratorStore((s) => s.activeTab)
  const setActiveTab = useConfiguratorStore((s) => s.setActiveTab)

  const garmentStyle = useConfiguratorStore((s) => s.garmentStyle)
  const setGarmentStyle = useConfiguratorStore((s) => s.setGarmentStyle)

  const background = useConfiguratorStore((s) => s.background)
  const setBackgroundPreset = useConfiguratorStore((s) => s.setBackgroundPreset)
  const setCustomBackgroundColor = useConfiguratorStore((s) => s.setCustomBackgroundColor)
  const setCustomBackgroundImage = useConfiguratorStore((s) => s.setCustomBackgroundImage)
  const resetBackground = useConfiguratorStore((s) => s.resetBackground)

  const materialEffects = useConfiguratorStore((s) => s.materialEffects)
  const setFabricType = useConfiguratorStore((s) => s.setFabricType)
  const updateAcidWash = useConfiguratorStore((s) => s.updateAcidWash)
  const updatePuffPrint = useConfiguratorStore((s) => s.updatePuffPrint)
  const updateLighting = useConfiguratorStore((s) => s.updateLighting)
  const resetMaterialEffects = useConfiguratorStore((s) => s.resetMaterialEffects)

  const motion = useConfiguratorStore((s) => s.motion)
  const setMotionMode = useConfiguratorStore((s) => s.setMotionMode)
  const setMotionSpeed = useConfiguratorStore((s) => s.setMotionSpeed)
  const toggleMotionPlaying = useConfiguratorStore((s) => s.toggleMotionPlaying)
  const resetMotion = useConfiguratorStore((s) => s.resetMotion)

  const autoRotate = useConfiguratorStore((s) => s.autoRotate)
  const toggleAutoRotate = useConfiguratorStore((s) => s.toggleAutoRotate)
  const setCameraView = useConfiguratorStore((s) => s.setCameraView)

  const exportConfig = useConfiguratorStore((s) => s.exportConfig)
  const updateExportConfig = useConfiguratorStore((s) => s.updateExportConfig)

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [hexInput, setHexInput] = useState(selectedColor || '#FFFFFF')
  const [exportStatus, setExportStatus] = useState('')

  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0 || isSwitchingSide) return
    for (const file of Array.from(files)) {
      try {
        await editor.uploadImage(file)
      } catch (err) {
        alert(err.message || 'Gagal mengunggah gambar.')
      }
    }
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDraggingOver(false)
    await handleFilesSelected(event.dataTransfer?.files)
  }

  const handleHexSubmit = (event) => {
    event.preventDefault()
    const formatted = hexInput.trim().startsWith('#')
      ? hexInput.trim()
      : `#${hexInput.trim()}`
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted)) {
      onColorChange(formatted.toUpperCase())
    } else {
      alert('Masukkan kode HEX 6 digit yang valid, contoh: #3182CE')
    }
  }

  const handlePlacementPreset = async (preset) => {
    if (isSwitchingSide) return

    if (preset.side && preset.side !== selectedSide) {
      await onSideChange(preset.side)
      setCameraView(preset.side)
    }

    await editor.applyRecommendedPlacement({
      targetSide: preset.side || selectedSide,
      placementZone: preset.zone,
    })
  }

  const handleBgImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCustomBackgroundImage(url)
    event.target.value = ''
  }

  const handleExport3D = async (formatOverride) => {
    const format = formatOverride || exportConfig.format
    if (exportConfig.isExporting) return

    updateExportConfig({ isExporting: true })
    setExportStatus(`Mengekspor ${format.toUpperCase()}...`)

    try {
      const ctx = sceneContextRef?.current
      const baseName = `digital-sablon-3d-${(shirt?.name || 'garment')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`

      if (format === 'png' || format === 'jpg') {
        if (!ctx?.gl) {
          throw new Error('3D Viewer belum siap. Beralih ke mode 3D atau Split terlebih dahulu.')
        }
        const res = await export3DMockupImage({
          gl: ctx.gl,
          scene: ctx.scene,
          camera: ctx.camera,
          format,
          resolution: exportConfig.resolution,
          transparentBg: exportConfig.transparentBg,
          backgroundColor: background.color,
          fileNamePrefix: baseName,
        })
        setExportStatus(`Berhasil mengunduh ${res.fileName} (${res.width}×${res.height}px)`)
      } else if (format === 'glb') {
        if (!ctx?.garmentGroup && !ctx?.scene) {
          throw new Error('Objek 3D belum siap untuk diekspor.')
        }
        const res = await export3DModelGLB({
          targetObject: ctx.garmentGroup || ctx.scene,
          fileNamePrefix: baseName,
        })
        setExportStatus(`Berhasil mengunduh model 3D ${res.fileName}`)
      } else if (format === 'video') {
        if (!ctx?.gl) {
          throw new Error('3D Viewer belum siap untuk merekam video.')
        }
        setExportStatus('Merekam animasi 3D selama 4 detik...')
        const res = await export3DVideoWebM({
          gl: ctx.gl,
          durationMs: 4000,
          fps: 30,
          fileNamePrefix: baseName,
        })
        setExportStatus(`Berhasil mengunduh video ${res.fileName}`)
      }
    } catch (error) {
      setExportStatus('')
      alert(error.message || 'Gagal mengekspor 3D mockup.')
    } finally {
      updateExportConfig({ isExporting: false })
    }
  }

  const mergedColors = [
    ...GARMENT_COLOR_PRESETS,
    ...colorOptions
      .filter(
        (opt) =>
          !GARMENT_COLOR_PRESETS.some(
            (preset) => preset.hex.toLowerCase() === String(opt.colorHex).toLowerCase()
          )
      )
      .map((opt) => ({
        name: opt.colorName,
        hex: opt.colorHex,
      })),
  ]

  return (
    <aside className="configurator-sidebar" aria-label="3D Studio Navigation">
      {/* Rail Ikon Kiri */}
      <nav className="configurator-sidebar-rail">
        {SIDEBAR_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`sidebar-rail-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="sidebar-rail-icon">{tab.icon}</span>
            <span className="sidebar-rail-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Drawer Konten Tab */}
      <div className="configurator-sidebar-drawer">
        {/* 1. UPLOAD DESIGN & GARMENT MODEL */}
        {activeTab === 'upload' && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="eyebrow">STEP 1 · MODEL & UPLOAD</span>
              <h3>Model Kaos & Desain</h3>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Pilih Model Pakaian 3D</label>
              <div className="garment-model-grid">
                {GARMENT_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={`garment-model-card ${garmentStyle === model.id ? 'active' : ''}`}
                    onClick={() => setGarmentStyle(model.id)}
                  >
                    <strong>{model.name}</strong>
                    <span>{model.fitLabel}</span>
                    <small>{model.description}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Unggah Desain Pribadi</label>
              <div
                className={`upload-dropzone ${isDraggingOver ? 'dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDraggingOver(true)
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDrop}
              >
                <span className="upload-dropzone-icon">⬆</span>
                <strong>Drag & Drop file desain di sini</strong>
                <span>PNG transparan, JPG, JPEG, WEBP (Maks. 15 MB)</span>
                <label className="upload-browse-btn">
                  Pilih File Gambar
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    hidden
                    onChange={(e) => {
                      handleFilesSelected(e.target.files)
                      e.target.value = ''
                    }}
                    disabled={isSwitchingSide}
                  />
                </label>
              </div>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Tipografi & Teks Kustom</label>
              <button
                type="button"
                className="sidebar-action-btn full-width"
                onClick={editor.addText}
                disabled={isSwitchingSide}
              >
                + Tambah Teks ke Kanvas ({selectedSide.replace('_', ' ').toUpperCase()})
              </button>
            </div>
          </div>
        )}

        {/* 2. IMAGE / ARTWORK & PLACEMENT */}
        {activeTab === 'artwork' && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="eyebrow">STEP 2 · PLACEMENT</span>
              <h3>Area Cetak & Penempatan</h3>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Pilih Area Cetak Aktif</label>
              <div className="side-selector-grid">
                {SIDE_OPTIONS.map((side) => (
                  <button
                    key={side.id}
                    type="button"
                    className={`side-selector-btn ${selectedSide === side.id ? 'active' : ''}`}
                    onClick={() => {
                      onSideChange(side.id)
                      setCameraView(side.id)
                    }}
                    disabled={isSwitchingSide}
                  >
                    {side.label}
                  </button>
                ))}
              </div>
              {printArea && (
                <div className="sidebar-info-pill">
                  Area Cetak: <strong>{printArea.physical_width_cm} × {printArea.physical_height_cm} cm</strong> ({printArea.dpi || 300} DPI)
                </div>
              )}
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Preset Posisi Sablon (Standar Industri)</label>
              <p className="sidebar-hint">
                Pilih objek pada kanvas lalu klik preset area untuk memindahkan desain secara presisi.
              </p>
              <div className="placement-preset-grid">
                {PRINT_PLACEMENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="placement-preset-btn"
                    onClick={() => handlePlacementPreset(preset)}
                    disabled={isSwitchingSide}
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">AI Multimodal Placement Assistant</label>
              <button
                type="button"
                className="sidebar-ai-btn full-width"
                disabled={isSwitchingSide || editor.isAnalyzing}
                onClick={() => {
                  editor
                    .analyzeSelectedImage({
                      shirtType: shirt?.type || garmentStyle,
                      currentSide: selectedSide,
                      currentColor: selectedColor,
                      projectId: activeProjectId,
                    })
                    .catch((error) => {
                      alert(error.message || 'Pilih objek gambar terlebih dahulu untuk dianalisis AI.')
                    })
                }}
              >
                {editor.isAnalyzing ? '✦ Menganalisis Desain...' : '✦ Analisis Rekomendasi AI'}
              </button>
            </div>
          </div>
        )}

        {/* 3. GARMENT COLOR */}
        {activeTab === 'color' && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="eyebrow">STEP 3 · GARMENT COLOR</span>
              <h3>Warna & Ukuran Pakaian</h3>
            </div>

            <div className="sidebar-block">
              <div className="sidebar-row-between">
                <label className="sidebar-label">Pilihan Warna Standar</label>
                <span className="sidebar-badge">{selectedColor}</span>
              </div>
              <div className="color-swatch-grid">
                {mergedColors.map((item) => (
                  <button
                    key={item.hex}
                    type="button"
                    className={`color-swatch-item ${
                      selectedColor.toLowerCase() === item.hex.toLowerCase() ? 'active' : ''
                    }`}
                    onClick={() => {
                      onColorChange(item.hex)
                      setHexInput(item.hex)
                    }}
                    title={`${item.name} (${item.hex})`}
                  >
                    <span
                      className="color-swatch-circle"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="color-swatch-name">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Custom Color & Kode HEX</label>
              <form className="custom-hex-form" onSubmit={handleHexSubmit}>
                <input
                  type="color"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(selectedColor) ? selectedColor : '#ffffff'
                  }
                  onChange={(e) => {
                    onColorChange(e.target.value)
                    setHexInput(e.target.value.toUpperCase())
                  }}
                  aria-label="Color Picker"
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  placeholder="#FFFFFF"
                  maxLength={7}
                />
                <button type="submit">Terapkan</button>
              </form>
            </div>

            {sizeOptions.length > 0 && (
              <div className="sidebar-block">
                <label className="sidebar-label">Ukuran Pakaian</label>
                <div className="shirt-size-options">
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={selectedSize === size ? 'selected' : ''}
                      onClick={() => onSizeChange(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="sidebar-reset-btn"
              onClick={() => {
                onColorChange('#FFFFFF')
                setHexInput('#FFFFFF')
              }}
            >
              ↺ Kembalikan Warna Default (White)
            </button>
          </div>
        )}

        {/* 4. BACKGROUND */}
        {activeTab === 'background' && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="eyebrow">STEP 4 · STUDIO ENVIRONMENT</span>
              <h3>Background Mockup</h3>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Preset Background Studio</label>
              <div className="bg-preset-grid">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`bg-preset-btn ${
                      background.presetId === preset.id ? 'active' : ''
                    }`}
                    onClick={() => setBackgroundPreset(preset.id)}
                  >
                    <span
                      className={`bg-preset-swatch ${preset.transparent ? 'checkerboard' : ''}`}
                      style={
                        preset.transparent
                          ? undefined
                          : { backgroundColor: preset.color }
                      }
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Warna Latar Kustom</label>
              <div className="custom-color-inline">
                <input
                  type="color"
                  value={background.color || '#f1f5f9'}
                  onChange={(e) => setCustomBackgroundColor(e.target.value)}
                />
                <span>{background.color || 'Transparan'}</span>
              </div>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Unggah Gambar Background</label>
              <label className="upload-browse-btn full-width">
                Pilih Gambar Latar
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={handleBgImageUpload}
                />
              </label>
            </div>

            <button
              type="button"
              className="sidebar-reset-btn"
              onClick={resetBackground}
            >
              ↺ Reset Background Default
            </button>
          </div>
        )}

        {/* 5. MOTION & ANIMATION */}
        {activeTab === 'motion' && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="eyebrow">STEP 5 · MOTION STUDIO</span>
              <h3>Simulasi Gerakan 3D</h3>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Pilih Mode Animasi</label>
              <div className="motion-mode-grid">
                {MOTION_MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`motion-mode-card ${
                      motion.mode === item.id ? 'active' : ''
                    }`}
                    onClick={() => setMotionMode(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">
                Kecepatan Animasi ({motion.speed.toFixed(2)}x)
              </label>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.05"
                value={motion.speed}
                onChange={(e) => setMotionSpeed(e.target.value)}
              />
            </div>

            <div className="sidebar-block sidebar-button-row">
              <button
                type="button"
                className="sidebar-action-btn"
                onClick={toggleMotionPlaying}
                disabled={motion.mode === 'static'}
              >
                {motion.isPlaying ? '⏸ Jeda Animasi' : '▶ Putar Animasi'}
              </button>
              <button
                type="button"
                className={`sidebar-action-btn ${autoRotate ? 'active' : ''}`}
                onClick={toggleAutoRotate}
              >
                ↻ Turntable 360°: {autoRotate ? 'ON' : 'OFF'}
              </button>
            </div>

            <button
              type="button"
              className="sidebar-reset-btn"
              onClick={resetMotion}
            >
              ↺ Reset ke Posisi Statis
            </button>
          </div>
        )}

        {/* 6. MATERIAL EFFECTS */}
        {activeTab === 'effects' && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="eyebrow">STEP 6 · MATERIAL & SHADER</span>
              <h3>Efek Kain & Sablon</h3>
            </div>

            {/* A. Fabric Texture */}
            <div className="sidebar-block">
              <label className="sidebar-label">A. Tekstur Kain (Fabric Texture)</label>
              <div className="fabric-texture-list">
                {FABRIC_TEXTURES.map((tex) => (
                  <button
                    key={tex.id}
                    type="button"
                    className={`fabric-texture-btn ${
                      materialEffects.fabricType === tex.id ? 'active' : ''
                    }`}
                    onClick={() => setFabricType(tex.id)}
                  >
                    <strong>{tex.name}</strong>
                    <span>Roughness {tex.roughness}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* B. Acid Wash */}
            <div className="sidebar-block effect-card">
              <div className="sidebar-row-between">
                <label className="sidebar-label">B. Efek Acid Wash / Vintage</label>
                <input
                  type="checkbox"
                  checked={materialEffects.acidWash.enabled}
                  onChange={(e) => updateAcidWash({ enabled: e.target.checked })}
                />
              </div>
              {materialEffects.acidWash.enabled && (
                <div className="effect-sliders">
                  <label>
                    Intensitas ({Math.round(materialEffects.acidWash.intensity * 100)}%)
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={materialEffects.acidWash.intensity}
                      onChange={(e) =>
                        updateAcidWash({ intensity: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Skala Tekstur ({materialEffects.acidWash.scale.toFixed(1)}x)
                    <input
                      type="range"
                      min="0.5"
                      max="4"
                      step="0.1"
                      value={materialEffects.acidWash.scale}
                      onChange={(e) =>
                        updateAcidWash({ scale: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              )}
            </div>

            {/* C. Puff Print */}
            <div className="sidebar-block effect-card">
              <div className="sidebar-row-between">
                <label className="sidebar-label">C. Efek Sablon Timbul (Puff Print)</label>
                <input
                  type="checkbox"
                  checked={materialEffects.puffPrint.enabled}
                  onChange={(e) => updatePuffPrint({ enabled: e.target.checked })}
                />
              </div>
              {materialEffects.puffPrint.enabled && (
                <div className="effect-sliders">
                  <label>
                    Ketebalan Timbul ({Math.round(materialEffects.puffPrint.height * 100)}%)
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={materialEffects.puffPrint.height}
                      onChange={(e) =>
                        updatePuffPrint({ height: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Intensitas 3D ({Math.round(materialEffects.puffPrint.intensity * 100)}%)
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={materialEffects.puffPrint.intensity}
                      onChange={(e) =>
                        updatePuffPrint({ intensity: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Roughness Tinta ({materialEffects.puffPrint.roughness.toFixed(2)})
                    <input
                      type="range"
                      min="0.1"
                      max="0.95"
                      step="0.05"
                      value={materialEffects.puffPrint.roughness}
                      onChange={(e) =>
                        updatePuffPrint({ roughness: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
              )}
            </div>

            {/* D. Lighting & Shadow */}
            <div className="sidebar-block effect-card">
              <label className="sidebar-label">D. Pencahayaan & Bayangan Studio</label>
              <div className="effect-sliders">
                <label>
                  Cahaya Utama ({materialEffects.lighting.directionalIntensity.toFixed(1)})
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={materialEffects.lighting.directionalIntensity}
                    onChange={(e) =>
                      updateLighting({ directionalIntensity: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Cahaya Ambient ({materialEffects.lighting.ambientIntensity.toFixed(1)})
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={materialEffects.lighting.ambientIntensity}
                    onChange={(e) =>
                      updateLighting({ ambientIntensity: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Sudut Cahaya ({materialEffects.lighting.lightAngle}°)
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={materialEffects.lighting.lightAngle}
                    onChange={(e) =>
                      updateLighting({ lightAngle: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={materialEffects.lighting.shadows}
                    onChange={(e) => updateLighting({ shadows: e.target.checked })}
                  />
                  Tampilkan Bayangan Lantai
                </label>
              </div>
            </div>

            <button
              type="button"
              className="sidebar-reset-btn"
              onClick={resetMaterialEffects}
            >
              ↺ Reset Semua Efek Material
            </button>
          </div>
        )}

        {/* 7. EXPORT & DOWNLOAD */}
        {activeTab === 'export' && (
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="eyebrow">STEP 7 · EXPORT & PRODUCTION</span>
              <h3>Unduh Mockup & File Cetak</h3>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Resolusi Mockup 3D</label>
              <select
                value={exportConfig.resolution}
                onChange={(e) => updateExportConfig({ resolution: e.target.value })}
              >
                <option value="1024x1024">1024 × 1024 px (Square Social)</option>
                <option value="1920x1080">1920 × 1080 px (Full HD Landscape)</option>
                <option value="2048x2048">2048 × 2048 px (Ultra HD Studio)</option>
              </select>

              <label className="checkbox-inline" style={{ marginTop: '0.6rem' }}>
                <input
                  type="checkbox"
                  checked={exportConfig.transparentBg}
                  onChange={(e) =>
                    updateExportConfig({ transparentBg: e.target.checked })
                  }
                />
                Background Transparan (khusus PNG)
              </label>
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">Unduh 3D Mockup</label>
              <div className="export-button-stack">
                <button
                  type="button"
                  className="sidebar-action-btn full-width"
                  disabled={exportConfig.isExporting}
                  onClick={() => handleExport3D('png')}
                >
                  ⬇ Export 3D Mockup PNG ({exportConfig.resolution})
                </button>
                <button
                  type="button"
                  className="sidebar-action-btn full-width"
                  disabled={exportConfig.isExporting}
                  onClick={() => handleExport3D('jpg')}
                >
                  ⬇ Export 3D Mockup JPG ({exportConfig.resolution})
                </button>
                <button
                  type="button"
                  className="sidebar-action-btn full-width"
                  disabled={exportConfig.isExporting}
                  onClick={() => handleExport3D('video')}
                >
                  🎬 Export Video Animasi 3D (WebM/MP4 · 4 dtk)
                </button>
                <button
                  type="button"
                  className="sidebar-action-btn full-width"
                  disabled={exportConfig.isExporting}
                  onClick={() => handleExport3D('glb')}
                >
                  📦 Export Objek 3D (.GLB Binary)
                </button>
              </div>
              {exportStatus && (
                <p className="sidebar-export-status">{exportStatus}</p>
              )}
            </div>

            <div className="sidebar-block">
              <label className="sidebar-label">File Produksi Sablon 2D (300 DPI)</label>
              <button
                type="button"
                className="sidebar-ai-btn full-width"
                disabled={!printArea || isSwitchingSide}
                onClick={async () => {
                  try {
                    const result = await editor.exportDesign({
                      shirtName: shirt?.name,
                      side: selectedSide,
                      printArea,
                      projectId: activeProjectId,
                    })
                    alert(
                      `File Siap Cetak Diunduh:\n${result.fileName}\n` +
                        `${result.pixelWidth} × ${result.pixelHeight} px (${result.physicalWidthCm} × ${result.physicalHeightCm} cm @ ${result.dpi} DPI)`
                    )
                  } catch (error) {
                    alert(error.message || 'Gagal mengekspor file produksi 2D.')
                  }
                }}
              >
                ⬇ Export File Cetak 2D ({selectedSide.toUpperCase()} · {printArea?.dpi || 300} DPI)
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
