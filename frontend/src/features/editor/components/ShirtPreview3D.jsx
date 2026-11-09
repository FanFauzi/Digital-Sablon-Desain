import { Suspense, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function Garment({ color, side, productType, designPreview }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()

    // Siluet kaos dibuat secara prosedural sebagai model preview awal.
    shape.moveTo(-0.38, 0.92)
    shape.lineTo(-0.67, 0.79)
    shape.lineTo(-1.06, 0.38)
    shape.lineTo(-0.83, 0.12)
    shape.lineTo(-0.59, 0.30)
    shape.lineTo(-0.59, -0.94)
    shape.lineTo(0.59, -0.94)
    shape.lineTo(0.59, 0.30)
    shape.lineTo(0.83, 0.12)
    shape.lineTo(1.06, 0.38)
    shape.lineTo(0.67, 0.79)
    shape.lineTo(0.38, 0.92)
    shape.lineTo(0.22, 0.79)
    shape.quadraticCurveTo(0, 0.57, -0.22, 0.79)
    shape.lineTo(-0.38, 0.92)
    shape.closePath()

    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 12,
    })

    result.center()
    result.computeVertexNormals()
    return result
  }, [])

  return (
    <group rotation={[0, side === 'back' ? Math.PI : 0, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.82}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {productType === 'hoodie' && (
        <mesh position={[0, 0.82, -0.09]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.075, 10, 32, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      {designPreview && <ArtworkTexture src={designPreview} />}
    </group>
  )
}

function ArtworkTexture({ src }) {
  const loadedTexture = useLoader(THREE.TextureLoader, src)
  const texture = useMemo(() => {
    const preparedTexture = loadedTexture.clone()
    preparedTexture.colorSpace = THREE.SRGBColorSpace
    preparedTexture.anisotropy = 8
    preparedTexture.needsUpdate = true
    return preparedTexture
  }, [loadedTexture])

  const aspectRatio = loadedTexture.image?.width / loadedTexture.image?.height || 0.8

  return (
    <mesh position={[0, -0.02, 0.105]}>
      <planeGeometry args={[0.59, 0.59 / aspectRatio]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function ShirtPreview3D({
  color = '#ffffff',
  side = 'front',
  productType = 'tshirt',
  designPreview = null,
}) {
  return (
    <div className="shirt-preview-canvas">
      <Canvas
        camera={{ position: [0, 0, 4.1], fov: 38 }}
        dpr={[1, 1.5]}
        shadows
      >
        <color attach="background" args={['#e9e9e5']} />
        <ambientLight intensity={1.35} />
        <directionalLight
          position={[3, 4, 5]}
          intensity={2.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 1, -3]} intensity={0.7} />
        <Suspense fallback={null}>
          <Garment
            color={color}
            side={side}
            productType={productType}
            designPreview={designPreview}
          />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={3.2}
          maxDistance={5.5}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
      <span className="preview-drag-hint">Geser untuk memutar · Scroll untuk zoom</span>
    </div>
  )
}
