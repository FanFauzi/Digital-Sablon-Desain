import { useRef, useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'

import useDesignEditor from '../features/editor/hooks/useDesignEditor'
import { EDITOR_CONFIG } from '../features/editor/utils/editorConfig'
import { getShirtById } from '../services/shirtService'
import {
  deleteEditorProject,
  getEditorProjects,
  loadEditorProject,
  saveEditorProject,
} from '../services/projectService'

import EditorToolbar from '../features/editor/components/EditorToolbar'
import PropertiesPanel from '../features/editor/components/PropertiesPanel'
import LayerPanel from '../features/editor/components/LayerPanel'
import AIAnalysisPanel from '../features/editor/components/AIAnalysisPanel'
import ShirtPreview3D from '../features/editor/components/ShirtPreview3D'
import Sidebar from '../features/configurator/components/Sidebar'
import { useConfiguratorStore } from '../features/configurator/store/configuratorStore'

const SIDE_LABELS = {
  front: 'FRONT (DEPAN)',
  back: 'BACK (BELAKANG)',
  left_sleeve: 'LEFT SLEEVE (LENGAN KIRI)',
  right_sleeve: 'RIGHT SLEEVE (LENGAN KANAN)',
}

export default function EditorPage() {
  const { shirtId } = useParams()

  const canvasElement = useRef(null)
  const viewportRef = useRef(null)
  const sceneContextRef = useRef(null)

  const editor = useDesignEditor(canvasElement)
  const { resizeCanvas, setPrintArea, resetSideDesigns } = editor

  const workspaceMode = useConfiguratorStore((s) => s.workspaceMode)
  const setWorkspaceMode = useConfiguratorStore((s) => s.setWorkspaceMode)
  const garmentStyle = useConfiguratorStore((s) => s.garmentStyle)
  const setGarmentStyle = useConfiguratorStore((s) => s.setGarmentStyle)
  const setCameraView = useConfiguratorStore((s) => s.setCameraView)
  const setActiveTab = useConfiguratorStore((s) => s.setActiveTab)
  const background = useConfiguratorStore((s) => s.background)
  const materialEffects = useConfiguratorStore((s) => s.materialEffects)
  const motion = useConfiguratorStore((s) => s.motion)
  const restoreConfiguratorConfig = useConfiguratorStore(
    (s) => s.restoreConfiguratorConfig
  )

  const [shirt, setShirt] = useState(null)
  const [shirtLoading, setShirtLoading] = useState(true)
  const [shirtError, setShirtError] = useState('')
  const [selectedColor, setSelectedColor] = useState('#ffffff')
  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedSide, setSelectedSide] = useState('front')
  const [isSwitchingSide, setIsSwitchingSide] = useState(false)
  const [projectName, setProjectName] = useState('Desain Saya')
  const [savedProjects, setSavedProjects] = useState([])
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [projectBusy, setProjectBusy] = useState(false)
  const [projectMessage, setProjectMessage] = useState('')
  const [projectMessageType, setProjectMessageType] = useState('success')

  const handleSceneReady = useCallback((ctx) => {
    sceneContextRef.current = ctx
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadShirt = async () => {
      setShirtLoading(true)
      setShirtError('')

      try {
        const data = await getShirtById(shirtId)
        if (!isMounted) return

        const frontPrintArea = data.print_areas?.find(
          (area) => area.view_side === 'front'
        )
        await resetSideDesigns(frontPrintArea)
        if (!isMounted) return

        setShirt(data)
        setSelectedSide('front')
        setCameraView('front')
        setActiveProjectId(null)
        setProjectName('Desain Saya')

        const lowerName = String(data.name || '').toLowerCase()
        if (data.type === 'hoodie' || lowerName.includes('hoodie')) {
          setGarmentStyle('hoodie')
        } else if (
          data.type === 'oversized' ||
          lowerName.includes('oversized')
        ) {
          setGarmentStyle('oversized')
        } else {
          setGarmentStyle('regular')
        }

        const firstVariant =
          data.variants?.find((variant) => variant.size === 'M') ||
          data.variants?.[0]

        if (firstVariant) {
          setSelectedColor(firstVariant.color_hex)
          setSelectedSize(firstVariant.size)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setShirtError(
            'Detail produk gagal dimuat. Pastikan server Laravel aktif.'
          )
        }
      } finally {
        if (isMounted) setShirtLoading(false)
      }
    }

    loadShirt()

    return () => {
      isMounted = false
    }
  }, [shirtId, resetSideDesigns, setCameraView, setGarmentStyle])

  useEffect(() => {
    let isMounted = true

    getEditorProjects(shirtId)
      .then((projects) => {
        if (isMounted) setSavedProjects(projects)
      })
      .catch((error) => {
        console.error(error)
        if (isMounted) {
          setProjectMessage(
            'Daftar proyek gagal dimuat. Periksa koneksi server dan sesi akun.'
          )
          setProjectMessageType('error')
        }
      })

    return () => {
      isMounted = false
    }
  }, [shirtId])

  useEffect(() => {
    const viewport = viewportRef.current

    if (!viewport) return

    const updateCanvasSize = () => {
      const availableWidth = viewport.clientWidth || 420

      const displayWidth = Math.min(availableWidth, EDITOR_CONFIG.width)

      resizeCanvas(displayWidth)
    }

    const observer = new ResizeObserver(updateCanvasSize)

    observer.observe(viewport)
    updateCanvasSize()

    return () => observer.disconnect()
  }, [resizeCanvas, workspaceMode])

  const colorOptions = [
    ...new Map(
      (shirt?.variants || []).map((variant) => [
        variant.color_hex,
        {
          colorHex: variant.color_hex,
          colorName: variant.color_name,
        },
      ])
    ).values(),
  ]

  const sizeOptions = [
    ...new Set(
      (shirt?.variants || [])
        .filter(
          (variant) =>
            String(variant.color_hex).toLowerCase() ===
            String(selectedColor).toLowerCase()
        )
        .map((variant) => variant.size)
    ),
  ]

  const allSizes =
    sizeOptions.length > 0
      ? sizeOptions
      : [
          ...new Set(
            (shirt?.variants || []).map((variant) => variant.size)
          ),
        ]

  const selectedVariant =
    shirt?.variants?.find(
      (variant) =>
        String(variant.color_hex).toLowerCase() ===
          String(selectedColor).toLowerCase() &&
        variant.size === selectedSize
    ) || shirt?.variants?.[0]

  const printArea =
    shirt?.print_areas?.find((area) => area.view_side === selectedSide) ||
    shirt?.print_areas?.find((area) => area.view_side === 'front')

  useEffect(() => {
    if (printArea) setPrintArea(printArea)
  }, [printArea, setPrintArea])

  const handleSaveProject = async () => {
    if (!shirt || projectBusy || isSwitchingSide) return

    setProjectBusy(true)
    setProjectMessage('')

    try {
      const canvasState = await editor.serializeCanvas()
      const saved = await saveEditorProject(activeProjectId, {
        name: projectName.trim() || `Desain ${shirt.name}`,
        shirt_variant_id: selectedVariant?.id || null,
        canvas_config: {
          shirt_id: Number(shirtId),
          shirt_name: shirt.name,
          selected_color: selectedColor,
          selected_size: selectedSize,
          selected_side: selectedSide,
          garment_style: garmentStyle,
          background,
          material_effects: materialEffects,
          motion,
        },
        editor_state: canvasState,
      })

      setActiveProjectId(saved.id)
      setProjectName(saved.name)
      setSavedProjects(await getEditorProjects(shirtId))
      setProjectMessage('Proyek 3D berhasil disimpan ke akun.')
      setProjectMessageType('success')
    } catch (error) {
      console.error(error)
      setProjectMessage(error.message || 'Gagal menyimpan proyek.')
      setProjectMessageType('error')
    } finally {
      setProjectBusy(false)
    }
  }

  const handleLoadProject = async (project) => {
    if (projectBusy || isSwitchingSide) return

    setProjectBusy(true)
    setProjectMessage('')

    try {
      const loadedProject = await loadEditorProject(project)
      const targetSide = loadedProject.selectedSide || 'front'
      await editor.restoreCanvas(loadedProject.canvasState, targetSide)
      setSelectedColor(loadedProject.selectedColor || selectedColor)
      setSelectedSize(loadedProject.selectedSize || 'M')
      setSelectedSide(targetSide)
      setCameraView(targetSide)
      if (loadedProject.canvasConfig) {
        restoreConfiguratorConfig(loadedProject.canvasConfig)
      }
      setProjectName(loadedProject.name || 'Desain Saya')
      setActiveProjectId(project.id)
      setProjectMessage(`Proyek "${loadedProject.name}" berhasil dibuka.`)
      setProjectMessageType('success')
    } catch (error) {
      console.error(error)
      setProjectMessage(error.message || 'Gagal membuka proyek.')
      setProjectMessageType('error')
    } finally {
      setProjectBusy(false)
    }
  }

  const handleDeleteProject = async (project) => {
    if (projectBusy || isSwitchingSide) return

    setProjectBusy(true)
    setProjectMessage('')

    try {
      await deleteEditorProject(project)
      setSavedProjects(await getEditorProjects(shirtId))

      if (activeProjectId === project.id) {
        setActiveProjectId(null)
      }

      setProjectMessage(
        project.storageType === 'cloud'
          ? 'Proyek berhasil dihapus dari akun.'
          : 'Proyek lokal berhasil dihapus dari browser.'
      )
      setProjectMessageType('success')
    } catch (error) {
      console.error(error)
      setProjectMessage(error.message || 'Gagal menghapus proyek.')
      setProjectMessageType('error')
    } finally {
      setProjectBusy(false)
    }
  }

  const handleNewProject = async () => {
    if (!shirt || projectBusy || isSwitchingSide) return

    setProjectBusy(true)
    setProjectMessage('')

    try {
      const frontPrintArea = shirt.print_areas?.find(
        (area) => area.view_side === 'front'
      )
      await resetSideDesigns(frontPrintArea)
      setSelectedSide('front')
      setCameraView('front')
      setActiveProjectId(null)
      setProjectName('Desain Saya')
      setProjectMessage('Area kerja direset untuk proyek baru.')
      setProjectMessageType('success')
    } catch (error) {
      console.error(error)
      setProjectMessage(error.message || 'Gagal membuat proyek baru.')
      setProjectMessageType('error')
    } finally {
      setProjectBusy(false)
    }
  }

  const handleSideChange = async (nextSide) => {
    if (
      !shirt ||
      nextSide === selectedSide ||
      isSwitchingSide ||
      projectBusy
    ) {
      return
    }

    const nextPrintArea =
      shirt.print_areas?.find((area) => area.view_side === nextSide) ||
      shirt.print_areas?.find((area) => area.view_side === 'front')

    setIsSwitchingSide(true)

    try {
      const switched = await editor.switchDesignSide(nextSide, nextPrintArea)
      if (switched) {
        setSelectedSide(nextSide)
        setCameraView(nextSide)
      }
    } catch (error) {
      console.error(error)
      alert(error.message || 'Gagal mengganti sisi desain.')
    } finally {
      setIsSwitchingSide(false)
    }
  }

  const handleColorChange = (colorHex) => {
    setSelectedColor(colorHex)

    const availableSizes = (shirt?.variants || [])
      .filter(
        (variant) =>
          String(variant.color_hex).toLowerCase() ===
          String(colorHex).toLowerCase()
      )
      .map((variant) => variant.size)

    if (availableSizes.length > 0) {
      const nextSize = availableSizes.includes(selectedSize)
        ? selectedSize
        : availableSizes.includes('M')
          ? 'M'
          : availableSizes[0]

      setSelectedSize(nextSize)
    }
  }

  return (
    <main className="editor-page studio-3d-page">
      {/* Top Studio Bar */}
      <header className="studio-topbar">
        <div className="studio-topbar-brand">
          <span className="eyebrow">DIGITAL SABLON · 3D CONFIGURATOR STUDIO</span>
          <div className="studio-topbar-title-row">
            <h1>{shirtLoading ? `Memuat #${shirtId}...` : shirt?.name || '3D Studio'}</h1>
            <span className="studio-badge">{garmentStyle.toUpperCase()}</span>
            <span className="studio-badge secondary">
              {SIDE_LABELS[selectedSide] || selectedSide.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="studio-workspace-switcher" role="group" aria-label="Mode Tampilan Studio">
          <button
            type="button"
            className={workspaceMode === 'split' ? 'active' : ''}
            onClick={() => setWorkspaceMode('split')}
          >
            Split 3D + 2D
          </button>
          <button
            type="button"
            className={workspaceMode === '3d' ? 'active' : ''}
            onClick={() => setWorkspaceMode('3d')}
          >
            Full 3D Studio
          </button>
          <button
            type="button"
            className={workspaceMode === '2d' ? 'active' : ''}
            onClick={() => setWorkspaceMode('2d')}
          >
            Full 2D Canvas
          </button>
        </div>

        <div className="studio-topbar-actions">
          <input
            type="text"
            className="studio-project-input"
            value={projectName}
            maxLength={100}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Nama proyek..."
          />
          <button
            type="button"
            className="studio-btn-primary"
            onClick={handleSaveProject}
            disabled={projectBusy || isSwitchingSide}
          >
            {projectBusy ? 'Menyimpan...' : activeProjectId ? 'Simpan' : 'Simpan Proyek'}
          </button>
          <button
            type="button"
            className="studio-btn-secondary"
            onClick={handleNewProject}
            disabled={projectBusy || isSwitchingSide}
          >
            Proyek Baru
          </button>
          <button
            type="button"
            className="studio-btn-accent"
            onClick={() => setActiveTab('export')}
          >
            ⬇ Export
          </button>
        </div>
      </header>

      {/* Quick Action Bar */}
      <EditorToolbar
        editor={editor}
        exportOptions={{
          shirtName: shirt?.name,
          shirtType: shirt?.type || garmentStyle,
          side: selectedSide,
          selectedColor,
          printArea,
          isSwitchingSide,
          projectId: activeProjectId,
        }}
      />

      {projectMessage && (
        <p
          className={`project-feedback ${projectMessageType === 'error' ? 'error' : 'success'}`}
          role="status"
        >
          {projectMessage}
        </p>
      )}

      {shirtLoading && (
        <div className="configurator-message">Memuat studio 3D & model pakaian...</div>
      )}

      {shirtError && (
        <div className="configurator-message configurator-error" role="alert">
          {shirtError}
        </div>
      )}

      {/* Main 3-Column Studio Layout (Sidebar | 3D + 2D Workspace | Properties & AI) */}
      <div className="studio-3d-workspace">
        {/* A. Left Sidebar Navigation (7 Menu PRD) */}
        <Sidebar
          editor={editor}
          shirt={shirt}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          selectedSide={selectedSide}
          colorOptions={colorOptions}
          sizeOptions={allSizes}
          printArea={printArea}
          isSwitchingSide={isSwitchingSide}
          activeProjectId={activeProjectId}
          onColorChange={handleColorChange}
          onSizeChange={setSelectedSize}
          onSideChange={handleSideChange}
          sceneContextRef={sceneContextRef}
        />

        {/* B. Center Main 3D Preview & 2D Interactive Canvas */}
        <section className={`studio-center-stage mode-${workspaceMode}`}>
          {/* Pane 1: Interactive 3D Viewer */}
          {workspaceMode !== '2d' && (
            <div className="studio-3d-pane">
              <div className="studio-pane-header">
                <div>
                  <span className="eyebrow">REAL-TIME 3D CONFIGURATOR</span>
                  <h2>
                    {shirt?.name || 'Garment'} · {selectedColor} · Size {selectedSize}
                  </h2>
                </div>
                <div className="studio-side-pills">
                  {(['front', 'back', 'left_sleeve', 'right_sleeve']).map((sideKey) => (
                    <button
                      key={sideKey}
                      type="button"
                      className={selectedSide === sideKey ? 'active' : ''}
                      onClick={() => handleSideChange(sideKey)}
                      disabled={isSwitchingSide || projectBusy}
                    >
                      {sideKey === 'front'
                        ? 'Depan'
                        : sideKey === 'back'
                          ? 'Belakang'
                          : sideKey === 'left_sleeve'
                            ? 'Lengan Kiri'
                            : 'Lengan Kanan'}
                    </button>
                  ))}
                </div>
              </div>

              <ShirtPreview3D
                color={selectedColor}
                side={selectedSide}
                productType={shirt?.type || garmentStyle}
                designPreview={editor.designPreview}
                designPreviewVersion={editor.designPreviewVersion}
                sidePreviews={editor.sidePreviews}
                onSceneReady={handleSceneReady}
                onSelectSide={handleSideChange}
              />
            </div>
          )}

          {/* Pane 2: 2D Fabric.js Placement Canvas (Always mounted so textures stay live) */}
          <div
            className={`studio-2d-pane ${
              workspaceMode === '3d' ? 'studio-2d-pane-hidden' : ''
            }`}
          >
            <div className="studio-pane-header">
              <div>
                <span className="eyebrow">2D PRINT AREA EDITOR · FULL 3D SURFACE</span>
                <h2>
                  Permukaan 3D: {SIDE_LABELS[selectedSide] || selectedSide.toUpperCase()}
                </h2>
              </div>
              <span className="studio-print-spec">
                Seluruh Permukaan 3D · {printArea?.dpi || 300} DPI
              </span>
            </div>

            <div className="canvas-viewport" ref={viewportRef}>
              <canvas ref={canvasElement} />
            </div>

            <div className="canvas-info">
              Garis ungu menunjukkan kontur siluet penuh model 3D · Anda bebas menempatkan gambar di seluruh permukaan pakaian (termasuk bahu, lengan, hingga tepi bawah kaos).
            </div>
          </div>
        </section>

        {/* C. Right Properties, Layers, AI Recommendations & Saved Projects */}
        <aside className="studio-right-inspector">
          <PropertiesPanel editor={editor} />
          <LayerPanel editor={editor} />
          <AIAnalysisPanel
            editor={editor}
            productContext={{
              projectId: activeProjectId,
              shirtType: shirt?.type || garmentStyle,
              selectedSide,
              selectedColor,
              colorOptions,
              onSelectColor: handleColorChange,
              onSelectSide: handleSideChange,
            }}
          />

          {/* Saved Projects Panel */}
          <section className="editor-panel saved-projects-panel">
            <h3>Proyek Tersimpan ({savedProjects.length})</h3>
            {savedProjects.length === 0 ? (
              <p className="saved-project-empty">
                Belum ada proyek tersimpan untuk produk ini.
              </p>
            ) : (
              <div className="saved-project-compact-list">
                {savedProjects.map((project) => (
                  <article className="saved-project-item" key={project.id}>
                    <div className="saved-project-info">
                      <strong>{project.name}</strong>
                      <span>
                        {new Date(project.updatedAt).toLocaleDateString('id-ID')}
                        {project.storageType === 'cloud' ? ' · Cloud' : ' · Lokal'}
                        {project.selectedColor ? ` · ${project.selectedColor}` : ''}
                      </span>
                    </div>
                    <div className="saved-project-actions">
                      <button
                        type="button"
                        onClick={() => handleLoadProject(project)}
                        disabled={projectBusy || isSwitchingSide}
                      >
                        Buka
                      </button>
                      <button
                        type="button"
                        className="project-delete-button"
                        onClick={() => handleDeleteProject(project)}
                        disabled={projectBusy || isSwitchingSide}
                      >
                        Hapus
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  )
}
