import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import ShirtModel from './ShirtModel'
import CameraController from './CameraController'
import Lighting from './Lighting'
import { useConfiguratorStore } from '../store/configuratorStore'

const CAMERA_VIEWS = [
  { id: 'front', label: 'Depan' },
  { id: 'back', label: 'Belakang' },
  { id: 'left_sleeve', label: 'Lengan Kiri' },
  { id: 'right_sleeve', label: 'Lengan Kanan' },
]

export default function ShirtScene({
  color = '#ffffff',
  activeSide = 'front',
  productType = 'tshirt',
  designPreview = null,
  designPreviewVersion = 0,
  sidePreviews = {},
  onSelectSide,
  onWebglCanvasReady,
  onSceneReady,
}) {
  const {
    garmentStyle,
    cameraView,
    cameraZoom,
    cameraResetTrigger,
    background,
    materialEffects,
    motion,
    setCameraView,
    setCameraZoom,
    triggerCameraReset,
  } = useConfiguratorStore()

  const handleViewClick = (viewId) => {
    setCameraView(viewId)
    if (
      typeof onSelectSide === 'function' &&
      ['front', 'back', 'left_sleeve', 'right_sleeve'].includes(viewId)
    ) {
      onSelectSide(viewId)
    }
  }

  const containerStyle = background.transparent
    ? {
        backgroundImage:
          'linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        backgroundColor: '#f4f4f5',
      }
    : background.customImageUrl
      ? {
          backgroundImage: `url(${background.customImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {
          backgroundColor: background.color || '#E9E9E5',
        }

  return (
    <div className="configurator-3d-stage" style={containerStyle}>
      <div className="configurator-camera-pills">
        {CAMERA_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`camera-pill-btn ${cameraView === view.id ? 'active' : ''}`}
            onClick={() => handleViewClick(view.id)}
          >
            {view.label}
          </button>
        ))}
        <button
          type="button"
          className="camera-pill-btn reset"
          onClick={triggerCameraReset}
          title="Reset posisi kamera ke tampilan awal"
        >
          ↺ Reset Kamera
        </button>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        camera={{ position: [0, 0.08, 3.45], fov: 36 }}
        onCreated={({ gl }) => {
          if (onWebglCanvasReady) {
            onWebglCanvasReady(gl.domElement)
          }
        }}
      >
        <Lighting lighting={materialEffects?.lighting} />

        <Suspense fallback={null}>
          <ShirtModel
            garmentStyle={productType === 'hoodie' ? 'hoodie' : garmentStyle}
            productType={productType}
            color={color}
            activeSide={activeSide}
            designPreview={designPreview}
            designPreviewVersion={designPreviewVersion}
            sidePreviews={sidePreviews}
            materialEffects={materialEffects}
            motion={motion}
            onSceneReady={onSceneReady}
          />
          {materialEffects?.lighting?.shadows !== false && (
            <ContactShadows
              position={[0, -1.04, 0]}
              opacity={0.38}
              scale={3.2}
              blur={2.2}
              far={2.4}
            />
          )}
        </Suspense>

        <CameraController
          cameraView={cameraView}
          cameraZoom={cameraZoom}
          cameraResetTrigger={cameraResetTrigger}
          autoRotate={motion?.cameraAutoRotate}
        />
      </Canvas>

      <div className="configurator-stage-footer">
        <div className="zoom-control-bar">
          <span>Zoom</span>
          <button
            type="button"
            onClick={() => setCameraZoom(cameraZoom - 0.15)}
            aria-label="Perkecil tampilan 3D"
          >
            −
          </button>
          <input
            type="range"
            min="0.6"
            max="1.8"
            step="0.05"
            value={cameraZoom}
            onChange={(e) => setCameraZoom(Number(e.target.value))}
          />
          <button
            type="button"
            onClick={() => setCameraZoom(cameraZoom + 0.15)}
            aria-label="Perbesar tampilan 3D"
          >
            +
          </button>
          <small>{Math.round(cameraZoom * 100)}%</small>
        </div>
        <span className="preview-drag-hint">
          Drag 360° · Scroll untuk Zoom · Klik kanan untuk Pan
        </span>
      </div>
    </div>
  )
}
