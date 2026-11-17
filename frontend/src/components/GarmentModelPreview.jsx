import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function GarmentModel({ modelPath }) {
  const { scene } = useGLTF(modelPath)

  const normalized = useMemo(() => {
    const object = scene.clone(true)
    object.updateMatrixWorld(true)

    const initialBounds = new THREE.Box3().setFromObject(object)
    const initialSize = initialBounds.getSize(new THREE.Vector3())

    if (initialSize.z > initialSize.y * 1.35) {
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

export default function GarmentModelPreview({ modelPath }) {
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
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.08, 2.65], fov: 36 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1.35} />
        <directionalLight position={[3, 4, 5]} intensity={2.1} />
        <directionalLight position={[-3, 1, -4]} intensity={0.7} />
        <Suspense fallback={<LoadingGarment />}>
          <GarmentModel modelPath={modelPath} />
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
    </div>
  )
}
