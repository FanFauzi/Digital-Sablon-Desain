import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const VIEW_ANGLES = {
  front: { azimuth: 0, polar: Math.PI / 2 },
  back: { azimuth: Math.PI, polar: Math.PI / 2 },
  left_sleeve: { azimuth: Math.PI / 2.15, polar: Math.PI / 2.05 },
  right_sleeve: { azimuth: -Math.PI / 2.15, polar: Math.PI / 2.05 },
  side_left: { azimuth: Math.PI / 2, polar: Math.PI / 2 },
  side_right: { azimuth: -Math.PI / 2, polar: Math.PI / 2 },
}

export default function CameraController({
  cameraView = 'front',
  cameraZoom = 1.0,
  cameraResetTrigger = 0,
  autoRotate = false,
}) {
  const controlsRef = useRef(null)
  const targetPositionRef = useRef(new THREE.Vector3(0, 0.08, 3.45))
  const isTransitioningRef = useRef(false)
  const { camera } = useThree()

  useEffect(() => {
    const viewPreset = VIEW_ANGLES[cameraView] || VIEW_ANGLES.front
    const zoomClamped = Math.min(2.0, Math.max(0.6, Number(cameraZoom) || 1.0))
    const baseDistance = 3.45 / zoomClamped

    const x = baseDistance * Math.sin(viewPreset.polar) * Math.sin(viewPreset.azimuth)
    const y = baseDistance * Math.cos(viewPreset.polar) + 0.06
    const z = baseDistance * Math.sin(viewPreset.polar) * Math.cos(viewPreset.azimuth)

    targetPositionRef.current.set(x, y, z)
    isTransitioningRef.current = true
  }, [cameraView, cameraZoom, cameraResetTrigger])

  useFrame((_, delta) => {
    if (!isTransitioningRef.current || !controlsRef.current) return

    camera.position.lerp(targetPositionRef.current, Math.min(1, delta * 7.5))
    controlsRef.current.target.lerp(new THREE.Vector3(0, 0.05, 0), Math.min(1, delta * 7.5))
    controlsRef.current.update()

    if (camera.position.distanceTo(targetPositionRef.current) < 0.015) {
      isTransitioningRef.current = false
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      autoRotate={Boolean(autoRotate)}
      autoRotateSpeed={2.2}
      minDistance={1.65}
      maxDistance={5.8}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={(Math.PI * 3) / 4}
      onStart={() => {
        isTransitioningRef.current = false
      }}
    />
  )
}
