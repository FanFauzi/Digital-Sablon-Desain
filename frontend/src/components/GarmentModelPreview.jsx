import { Component, Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const assetCheckCache = new Map()

function isModelResponse(response) {
  if (!response.ok) return false
  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  return !contentType.includes('text/html') && !contentType.includes('application/json')
}

function checkModelAsset(path) {
  if (!assetCheckCache.has(path)) {
    assetCheckCache.set(
      path,
      fetch(path, { method: 'HEAD', cache: 'force-cache' })
        .then(isModelResponse)
        .catch(() => false)
    )
  }
  return assetCheckCache.get(path)
}

class PreviewErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

function GarmentModel({ modelPath }) {
  const { scene } = useGLTF(modelPath)

  const normalized = useMemo(() => {
    const object = scene.clone(true)
    object.updateMatrixWorld(true)

    const initialBounds = new THREE.Box3().setFromObject(object)
    const initialSize = initialBounds.getSize(new THREE.Vector3())

    if (modelPath.endsWith('/hoodie.glb')) {
      // Samakan orientasi kartu preview dengan sumbu kanonis konfigurator.
      object.rotation.y = Math.PI / 2
    } else if (initialSize.z > initialSize.y * 1.35) {
      // Model Z-up standar: ubah sumbu Z menjadi sumbu tinggi Y.
      object.rotation.x = -Math.PI / 2
    }

    object.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(object)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const scale = 1.62 / Math.max(size.x, size.y, size.z, 0.001)

    return {
      object,
      scale,
      position: [-center.x * scale, -center.y * scale, -center.z * scale],
    }
  }, [scene])

  return (
    <group position={normalized.position} scale={normalized.scale}>
      <primitive object={normalized.object} />
    </group>
  )
}

function LoadingGarment() {
  return (
    <mesh>
      <boxGeometry args={[0.65, 0.85, 0.12]} />
      <meshStandardMaterial color="#d7d7d1" />
    </mesh>
  )
}

function ModelMessage({ children }) {
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        color: '#66675f',
        background: '#e9e9e5',
        fontSize: 12,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}

export default function GarmentModelPreview({ modelPath, fallbackPath }) {
  const [assetState, setAssetState] = useState({
    key: '',
    path: '',
    status: 'loading',
  })
  const selectionKey = `${modelPath || ''}|${fallbackPath || ''}`

  useEffect(() => {
    let isMounted = true

    const resolveAsset = async () => {
      const candidates = [...new Set([modelPath, fallbackPath].filter(Boolean))]
      for (const candidate of candidates) {
        if (await checkModelAsset(candidate)) {
          if (isMounted) {
            setAssetState({
              key: selectionKey,
              path: candidate,
              status: 'ready',
            })
          }
          return
        }
      }

      if (isMounted) {
        setAssetState({
          key: selectionKey,
          path: '',
          status: 'missing',
        })
      }
    }

    resolveAsset()

    return () => {
      isMounted = false
    }
  }, [modelPath, fallbackPath, selectionKey])

  const isCurrentSelection = assetState.key === selectionKey
  const resolvedPath = isCurrentSelection ? assetState.path : ''
  const checked =
    isCurrentSelection &&
    (assetState.status === 'missing' || assetState.status === 'error')

  const handleModelError = async (error) => {
    console.error(`Gagal merender model 3D ${resolvedPath}:`, error)

    if (fallbackPath && fallbackPath !== resolvedPath && (await checkModelAsset(fallbackPath))) {
      setAssetState({
        key: selectionKey,
        path: fallbackPath,
        status: 'ready',
      })
      return
    }

    setAssetState({
      key: selectionKey,
      path: '',
      status: 'error',
    })
  }

  const unavailable = (
    <ModelMessage>
      Model 3D gagal dimuat. Periksa file GLB dan console browser untuk detailnya.
    </ModelMessage>
  )

  return (
    <div
      className="garment-model-preview"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#e9e9e5',
      }}
    >
      {!resolvedPath ? (
        checked ? (
          unavailable
        ) : (
          <ModelMessage>Memuat model 3D...</ModelMessage>
        )
      ) : (
        <PreviewErrorBoundary
          key={resolvedPath}
          fallback={unavailable}
          onError={handleModelError}
        >
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0.08, 2.65], fov: 36 }}
            gl={{ alpha: true, antialias: true }}
          >
            <ambientLight intensity={1.35} />
            <directionalLight position={[3, 4, 5]} intensity={2.1} />
            <directionalLight position={[-3, 1, -4]} intensity={0.7} />
            <Suspense fallback={<LoadingGarment />}>
              <GarmentModel modelPath={resolvedPath} />
            </Suspense>
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              enableRotate
              autoRotate
              autoRotateSpeed={1.2}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={(Math.PI * 2) / 3}
            />
          </Canvas>
        </PreviewErrorBoundary>
      )}
    </div>
  )
}
