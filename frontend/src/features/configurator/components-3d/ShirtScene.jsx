import { Suspense, useRef } from 'react'
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
    autoRotate,
    background,
    materialEffects,
    motion,
    setCameraView,
    setCameraZoom,
    triggerCameraReset,
    toggleAutoRotate,
  } = useConfiguratorStore()

  const r3fContextRef = useRef({
    gl: null,
    scene: null,
    camera: null,
    garmentGroup: null,
  })

  const notifySceneReady = (patch) => {
    r3fContextRef.current = { ...r3fContextRef.current, ...patch }
    if (onSceneReady) {
      onSceneReady(r3fContextRef.current)
    }
  }

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
    ? undefined
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
    <div
      className={`shirt-3d-stage ${background.transparent ? 'checkerboard-bg' : ''}`}
      style={containerStyle}
    >
      {/* Top HUD Badges */}
      <div className="shirt-3d-hud-top">
        <span className="shirt-3d-badge">
          MODEL: {garmentStyle.toUpperCase()}
        </span>
        <span className="shirt-3d-badge">
          FABRIC: {(materialEffects?.fabricType || 'cotton_combed').replace('_', ' ').toUpperCase()}
        </span>
        {materialEffects?.acidWash?.enabled && (
          <span className="shirt-3d-badge accent">ACID WASH</span>
        )}
        {materialEffects?.puffPrint?.enabled && (
          <span className="shirt-3d-badge accent">PUFF PRINT 3D</span>
        )}
        {motion?.mode && motion.mode !== 'static' && (
          <span className="shirt-3d-badge accent">
            MOTION: {motion.mode.toUpperCase()} ({motion.speed}x)
          </span>
        )}
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        camera={{ position: [0, 0.08, 3.45], fov: 36 }}
        onCreated={({ gl, scene, camera }) => {
          if (onWebglCanvasReady) {
            onWebglCanvasReady(gl.domElement)
          }
          notifySceneReady({ gl, scene, camera })
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
            onSceneReady={(garmentGroup) => notifySceneReady({ garmentGroup })}
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
          autoRotate={Boolean(autoRotate || motion?.cameraAutoRotate)}
        />
      </Canvas>

      {/* Bottom Camera & Zoom Bar */}
      <div className="shirt-3d-camera-bar">
        <div className="camera-view-pills">
          {CAMERA_VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className={cameraView === view.id ? 'active' : ''}
              onClick={() => handleViewClick(view.id)}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="camera-zoom-controls">
          <button
            type="button"
            onClick={() => setCameraZoom(cameraZoom - 0.15)}
            title="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            onClick={triggerCameraReset}
            title="Reset Kamera"
          >
            {Math.round(cameraZoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setCameraZoom(cameraZoom + 0.15)}
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className={autoRotate ? 'active' : ''}
            onClick={toggleAutoRotate}
            title="Putar Otomatis 360°"
          >
            ↻ 360°
          </button>
        </div>
      </div>
    </div>
  )
}
