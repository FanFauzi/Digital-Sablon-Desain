import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  FABRIC_TEXTURES,
  GARMENT_MODELS,
} from '../store/configuratorStore'
import {
  createPuffPrintBumpMap,
  getAcidWashTexture,
  getFabricBumpTexture,
} from '../services/textureService'

function PrintSurfaceTexture({
  geometry,
  src,
  puffPrint = {},
}) {
  const loadedTexture = useLoader(THREE.TextureLoader, src)

  const { colorTexture, bumpTexture } = useMemo(() => {
    const tex = loadedTexture.clone()
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    tex.flipY = true
    tex.needsUpdate = true

    const bump =
      puffPrint?.enabled && loadedTexture.image
        ? createPuffPrintBumpMap(loadedTexture.image)
        : null

    if (bump) {
      bump.flipY = true
      bump.needsUpdate = true
    }

    return { colorTexture: tex, bumpTexture: bump }
  }, [loadedTexture, puffPrint?.enabled])

  useEffect(() => {
    return () => {
      colorTexture.dispose()
      if (bumpTexture) bumpTexture.dispose()
    }
  }, [colorTexture, bumpTexture])

  const puffScale = puffPrint?.enabled
    ? (Number(puffPrint.height) || 0.55) * (Number(puffPrint.intensity) || 0.7) * 0.045
    : 0.002

  const roughness = puffPrint?.enabled
    ? Number(puffPrint.roughness) || 0.45
    : 0.65

  return (
    <mesh
      geometry={geometry}
      scale={puffPrint?.enabled ? [1.003, 1.003, 1.008] : [1, 1, 1]}
    >
      <meshStandardMaterial
        map={colorTexture}
        bumpMap={bumpTexture || null}
        bumpScale={puffScale}
        roughness={roughness}
        metalness={0.02}
        transparent
        alphaTest={0.03}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function ShirtModel({
  garmentStyle = 'regular',
  productType = 'tshirt',
  color = '#ffffff',
  sidePreviews = {},
  designPreview = null,
  activeSide = 'front',
  designPreviewVersion = 0,
  materialEffects = {},
  motion = {},
  onSceneReady,
}) {
  const groupRef = useRef(null)

  const resolvedModelPath = useMemo(() => {
    if (productType === 'hoodie' || garmentStyle === 'hoodie') {
      return '/models/hoodie-classic.glb'
    }
    const found = GARMENT_MODELS.find((item) => item.id === garmentStyle)
    return found ? found.modelPath : '/models/tshirt-regular.glb'
  }, [garmentStyle, productType])

  const gltf = useGLTF(resolvedModelPath)

  // Clone geometries supaya animasi vertex (Waves / Knit) tidak memutasi cache global GLTF
  const clonedMeshes = useMemo(() => {
    const result = {}
    if (!gltf?.scene) return result

    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geom = child.geometry.clone()
        geom.userData.basePositions = new Float32Array(
          geom.attributes.position.array
        )
        result[child.name] = geom
      }
    })
    return result
  }, [gltf])

  useEffect(() => {
    if (onSceneReady && groupRef.current) {
      onSceneReady(groupRef.current)
    }
  }, [onSceneReady, resolvedModelPath])

  const fabricConfig = useMemo(() => {
    return (
      FABRIC_TEXTURES.find((f) => f.id === materialEffects?.fabricType) ||
      FABRIC_TEXTURES[1]
    )
  }, [materialEffects?.fabricType])

  const fabricBumpMap = useMemo(() => {
    return getFabricBumpTexture(fabricConfig.id, fabricConfig.weaveScale)
  }, [fabricConfig])

  const acidWashMap = useMemo(() => {
    if (!materialEffects?.acidWash?.enabled) return null
    return getAcidWashTexture(
      color,
      materialEffects.acidWash.intensity,
      materialEffects.acidWash.scale
    )
  }, [
    color,
    materialEffects?.acidWash?.enabled,
    materialEffects?.acidWash?.intensity,
    materialEffects?.acidWash?.scale,
  ])

  const knitProgressRef = useRef(0)

  // Animasi real-time: Static, Waves (angin), Walk (ritme langkah), Knit (rajutan kain)
  useFrame((state, delta) => {
    const group = groupRef.current
    const bodyGeom = clonedMeshes.Garment_Body
    if (!group || !bodyGeom) return

    const mode = motion?.mode || 'static'
    const isPlaying = motion?.isPlaying !== false
    const speed = Number(motion?.speed) || 1.0
    const t = state.clock.getElapsedTime() * speed

    const posAttr = bodyGeom.attributes.position
    const basePos = bodyGeom.userData.basePositions

    if (!isPlaying || mode === 'static') {
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      if (basePos && posAttr) {
        posAttr.array.set(basePos)
        posAttr.needsUpdate = true
      }
      return
    }

    if (mode === 'waves') {
      group.position.set(0, Math.sin(t * 1.6) * 0.015, 0)
      group.rotation.set(0, Math.sin(t * 0.9) * 0.05, 0)

      if (basePos && posAttr) {
        const arr = posAttr.array
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePos[i]
          const by = basePos[i + 1]
          const bz = basePos[i + 2]
          // Efek gelombang kain makin kuat ke arah bawah hem kaos
          const hemFactor = Math.max(0, (0.65 - by) / 1.6)
          const waveZ =
            Math.sin(bx * 5.0 + t * 3.8) *
            Math.cos(by * 3.5 - t * 2.6) *
            0.032 *
            hemFactor
          const waveX = Math.cos(by * 4.0 + t * 3.0) * 0.012 * hemFactor
          arr[i] = bx + waveX
          arr[i + 1] = by
          arr[i + 2] = bz + waveZ
        }
        posAttr.needsUpdate = true
      }
    } else if (mode === 'walk') {
      // Simulasi ritme langkah & ayunan bahu saat berjalan
      const bounce = Math.abs(Math.sin(t * 4.2)) * 0.045
      const sway = Math.sin(t * 2.1) * 0.03
      const twist = Math.sin(t * 4.2) * 0.14
      const tilt = Math.cos(t * 4.2) * 0.035

      group.position.set(sway, bounce - 0.02, 0)
      group.rotation.set(0.04, twist, tilt)

      if (basePos && posAttr) {
        const arr = posAttr.array
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePos[i]
          const by = basePos[i + 1]
          const bz = basePos[i + 2]
          // Ayunan lengan berlawanan antara kiri (+X) dan kanan (-X)
          const armFactor = Math.max(0, (Math.abs(bx) - 0.45) / 0.5)
          const armSwing = Math.sin(t * 4.2) * (bx > 0 ? 1 : -1) * 0.09 * armFactor
          arr[i] = bx
          arr[i + 1] = by
          arr[i + 2] = bz + armSwing
        }
        posAttr.needsUpdate = true
      }
    } else if (mode === 'knit') {
      // Animasi pembentukan rajutan kain dari bawah ke atas secara siklik
      knitProgressRef.current = (knitProgressRef.current + delta * 0.45 * speed) % 1.35
      const thresholdY = -1.0 + knitProgressRef.current * 2.2

      group.position.set(0, 0, 0)
      group.rotation.set(0, Math.sin(t * 1.2) * 0.18, 0)

      if (basePos && posAttr) {
        const arr = posAttr.array
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePos[i]
          const by = basePos[i + 1]
          const bz = basePos[i + 2]
          const distAbove = by - thresholdY
          if (distAbove > 0) {
            const shrink = Math.max(0.08, 1.0 - distAbove * 1.5)
            const ripple = Math.sin(bx * 18 + t * 8) * 0.025
            arr[i] = bx * shrink
            arr[i + 1] = by + ripple
            arr[i + 2] = bz * shrink
          } else {
            arr[i] = bx
            arr[i + 1] = by
            arr[i + 2] = bz
          }
        }
        posAttr.needsUpdate = true
      }
    }
  })

  const frontSrc = sidePreviews?.front || (activeSide === 'front' ? designPreview : null)
  const backSrc = sidePreviews?.back || (activeSide === 'back' ? designPreview : null)
  const leftSleeveSrc =
    sidePreviews?.left_sleeve || (activeSide === 'left_sleeve' ? designPreview : null)
  const rightSleeveSrc =
    sidePreviews?.right_sleeve || (activeSide === 'right_sleeve' ? designPreview : null)

  return (
    <group ref={groupRef}>
      {clonedMeshes.Garment_Body && (
        <mesh
          name="Garment_Body"
          geometry={clonedMeshes.Garment_Body}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={acidWashMap ? '#ffffff' : color}
            map={acidWashMap || null}
            bumpMap={fabricBumpMap}
            bumpScale={fabricConfig.bumpScale}
            roughness={fabricConfig.roughness}
            metalness={0.02}
            wireframe={motion?.mode === 'knit' && knitProgressRef.current < 0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {frontSrc && clonedMeshes.Print_Front && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`front-${activeSide === 'front' ? designPreviewVersion : 'saved'}`}
            geometry={clonedMeshes.Print_Front}
            src={frontSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}

      {backSrc && clonedMeshes.Print_Back && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`back-${activeSide === 'back' ? designPreviewVersion : 'saved'}`}
            geometry={clonedMeshes.Print_Back}
            src={backSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}

      {leftSleeveSrc && clonedMeshes.Print_LeftSleeve && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`left_sleeve-${activeSide === 'left_sleeve' ? designPreviewVersion : 'saved'}`}
            geometry={clonedMeshes.Print_LeftSleeve}
            src={leftSleeveSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}

      {rightSleeveSrc && clonedMeshes.Print_RightSleeve && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`right_sleeve-${activeSide === 'right_sleeve' ? designPreviewVersion : 'saved'}`}
            geometry={clonedMeshes.Print_RightSleeve}
            src={rightSleeveSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}
    </group>
  )
}

useGLTF.preload('/models/tshirt-regular.glb')
useGLTF.preload('/models/tshirt-oversized.glb')
useGLTF.preload('/models/hoodie-classic.glb')
