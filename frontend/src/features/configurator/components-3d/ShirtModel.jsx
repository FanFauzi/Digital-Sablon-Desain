import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import {
  FABRIC_TEXTURES,
  GARMENT_MODELS,
  useConfiguratorStore,
} from '../store/configuratorStore'
import {
  createPuffPrintBumpMap,
  getAcidWashTexture,
  getFabricBumpTexture,
} from '../services/textureService'

const WHITE_1X1_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='

const modelCache = new Map()

/**
 * Buat LoadingManager yang mencegah error 404 tekstur eksternal bawaan file FBX
 * agar warna kaos & tekstur kain dikendalikan penuh oleh 3D Configurator.
 */
function createSafeLoadingManager() {
  const manager = new THREE.LoadingManager()
  manager.setURLModifier((url) => {
    if (
      /\.(png|jpe?g|tga|bmp|dds|tif|webp)$/i.test(url) &&
      !url.startsWith('data:') &&
      !url.startsWith('blob:')
    ) {
      return WHITE_1X1_DATA_URL
    }
    return url
  })
  return manager
}

/**
 * Pastikan geometri memiliki atribut UV agar tekstur kain & Acid Wash dapat dipetakan.
 */
function ensureGeometryUVs(geometry, bbox) {
  if (geometry.attributes.uv) return
  const pos = geometry.attributes.position
  if (!pos) return

  const uvs = new Float32Array(pos.count * 2)
  const sizeX = Math.max(0.001, bbox.max.x - bbox.min.x)
  const sizeY = Math.max(0.001, bbox.max.y - bbox.min.y)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    uvs[i * 2] = (x - bbox.min.x) / sizeX
    uvs[i * 2 + 1] = (y - bbox.min.y) / sizeY
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}

/**
 * Menghasilkan patch permukaan cetak (Front, Back, Left Sleeve, Right Sleeve)
 * yang mengikuti kontur asli permukaan model 3D (.FBX maupun .GLB) menggunakan Raycasting.
 */
function buildRayconformedPrintPatches(bodyMeshes, bbox) {
  const raycaster = new THREE.Raycaster()
  const width = bbox.max.x - bbox.min.x
  const height = bbox.max.y - bbox.min.y

  // Pastikan matrixWorld terbarui sebelum raycast
  bodyMeshes.forEach((m) => m.updateMatrixWorld(true))

  const createTorsoPatch = (isFront) => {
    const cols = 26
    const rows = 32
    const patchW = width * 0.36
    const patchH = height * 0.48
    const centerY = bbox.min.y + height * 0.49

    const positions = []
    const uvs = []
    const zGrid = Array.from({ length: rows + 1 }, () =>
      new Float32Array(cols + 1)
    )

    const fallbackZ = isFront ? bbox.max.z * 0.72 : bbox.min.z * 0.72
    const rayStartZ = isFront ? bbox.max.z + 1.5 : bbox.min.z - 1.5
    const rayDir = new THREE.Vector3(0, 0, isFront ? -1 : 1)
    const origin = new THREE.Vector3()

    for (let r = 0; r <= rows; r++) {
      const v = r / rows
      const y = centerY + patchH * 0.5 - v * patchH

      for (let c = 0; c <= cols; c++) {
        const u = c / cols
        const x = isFront
          ? -patchW * 0.5 + u * patchW
          : patchW * 0.5 - u * patchW

        origin.set(x, y, rayStartZ)
        raycaster.set(origin, rayDir)
        const hits = raycaster.intersectObjects(bodyMeshes, false)

        if (hits.length > 0) {
          zGrid[r][c] = hits[0].point.z
        } else {
          zGrid[r][c] = fallbackZ
        }
      }
    }

    // Haluskan permukaan Z (smoothing 3x3) agar cetakan mengikuti lekukan kain dengan mulus
    const smoothedZ = Array.from({ length: rows + 1 }, () =>
      new Float32Array(cols + 1)
    )
    const normalOffset = isFront ? 0.0055 : -0.0055

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        let sum = 0
        let count = 0
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr
            const nc = c + dc
            if (nr >= 0 && nr <= rows && nc >= 0 && nc <= cols) {
              sum += zGrid[nr][nc]
              count++
            }
          }
        }
        const avgZ = sum / count
        // Pastikan tidak menembus ke dalam permukaan asli
        const safeZ = isFront
          ? Math.max(avgZ, zGrid[r][c]) + normalOffset
          : Math.min(avgZ, zGrid[r][c]) + normalOffset
        smoothedZ[r][c] = safeZ
      }
    }

    for (let r = 0; r <= rows; r++) {
      const v = r / rows
      const y = centerY + patchH * 0.5 - v * patchH
      for (let c = 0; c <= cols; c++) {
        const u = c / cols
        const x = isFront
          ? -patchW * 0.5 + u * patchW
          : patchW * 0.5 - u * patchW
        positions.push(x, y, smoothedZ[r][c])
        uvs.push(u, 1.0 - v)
      }
    }

    const indices = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * (cols + 1) + c
        const i1 = i0 + 1
        const i2 = (r + 1) * (cols + 1) + c
        const i3 = i2 + 1
        if (isFront) {
          indices.push(i0, i2, i1)
          indices.push(i1, i2, i3)
        } else {
          indices.push(i0, i1, i2)
          indices.push(i1, i3, i2)
        }
      }
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geom.setIndex(indices)
    geom.computeVertexNormals()
    return geom
  }

  const createSleevePatch = (isLeftSleeve) => {
    // Left sleeve berada di sisi +X model, Right sleeve berada di sisi -X model
    const signX = isLeftSleeve ? 1 : -1
    const cols = 16
    const rows = 18

    // Cari titik-titik lengan pada area luar bahu/lengan
    let minY = Infinity
    let maxY = -Infinity
    let sumZ = 0
    let count = 0
    const xInner = width * 0.27
    const xOuter = width * 0.44

    bodyMeshes.forEach((mesh) => {
      const pos = mesh.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i) * signX
        const vy = pos.getY(i)
        const vz = pos.getZ(i)
        if (vx >= xInner && vx <= xOuter && vy > bbox.min.y + height * 0.35) {
          if (vy < minY) minY = vy
          if (vy > maxY) maxY = vy
          sumZ += vz
          count++
        }
      }
    })

    const centerY =
      count > 10
        ? (minY + maxY) * 0.52
        : bbox.min.y + height * 0.66
    const centerZ = count > 10 ? sumZ / count : 0
    const patchH = Math.min(height * 0.22, Math.max(0.18, (maxY - minY) * 0.65 || 0.26))
    const patchDepth = Math.min(width * 0.16, 0.24)

    const positions = []
    const uvs = []
    const xGrid = Array.from({ length: rows + 1 }, () =>
      new Float32Array(cols + 1)
    )

    const rayStartX = signX * (bbox.max.x + 1.2)
    const rayDir = new THREE.Vector3(-signX, 0, 0)
    const origin = new THREE.Vector3()
    const fallbackX = signX * (width * 0.35)

    for (let r = 0; r <= rows; r++) {
      const v = r / rows
      const y = centerY + patchH * 0.5 - v * patchH

      for (let c = 0; c <= cols; c++) {
        const u = c / cols
        const z = isLeftSleeve
          ? centerZ + patchDepth * 0.5 - u * patchDepth
          : centerZ - patchDepth * 0.5 + u * patchDepth

        origin.set(rayStartX, y, z)
        raycaster.set(origin, rayDir)
        const hits = raycaster.intersectObjects(bodyMeshes, false)

        if (hits.length > 0) {
          xGrid[r][c] = hits[0].point.x
        } else {
          xGrid[r][c] = fallbackX
        }
      }
    }

    const normalOffset = signX * 0.0055
    for (let r = 0; r <= rows; r++) {
      const v = r / rows
      const y = centerY + patchH * 0.5 - v * patchH
      for (let c = 0; c <= cols; c++) {
        const u = c / cols
        const z = isLeftSleeve
          ? centerZ + patchDepth * 0.5 - u * patchDepth
          : centerZ - patchDepth * 0.5 + u * patchDepth

        let sum = 0
        let cnt = 0
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr
            const nc = c + dc
            if (nr >= 0 && nr <= rows && nc >= 0 && nc <= cols) {
              sum += xGrid[nr][nc]
              cnt++
            }
          }
        }
        const avgX = sum / cnt
        const safeX =
          signX > 0
            ? Math.max(avgX, xGrid[r][c]) + normalOffset
            : Math.min(avgX, xGrid[r][c]) + normalOffset

        positions.push(safeX, y, z)
        uvs.push(u, 1.0 - v)
      }
    }

    const indices = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * (cols + 1) + c
        const i1 = i0 + 1
        const i2 = (r + 1) * (cols + 1) + c
        const i3 = i2 + 1
        indices.push(i0, i2, i1)
        indices.push(i1, i2, i3)
      }
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geom.setIndex(indices)
    geom.computeVertexNormals()
    return geom
  }

  return {
    Print_Front: createTorsoPatch(true),
    Print_Back: createTorsoPatch(false),
    Print_LeftSleeve: createSleevePatch(true),
    Print_RightSleeve: createSleevePatch(false),
  }
}

/**
 * Normalisasi skala, posisi tengah, orientasi, dan area cetak untuk model .FBX maupun .GLB.
 */
function normalizeAndPrepareModel(rawRoot) {
  rawRoot.updateMatrixWorld(true)

  const namedMeshes = {}
  const bodyGeometries = []

  rawRoot.traverse((child) => {
    if (!child.isMesh || !child.geometry) return

    const geom = child.geometry.clone()
    geom.applyMatrix4(child.matrixWorld)

    if (
      [
        'Garment_Body',
        'Print_Front',
        'Print_Back',
        'Print_LeftSleeve',
        'Print_RightSleeve',
      ].includes(child.name)
    ) {
      namedMeshes[child.name] = geom
    } else {
      bodyGeometries.push(geom)
    }
  })

  // Jika model sudah memiliki struktur 5-mesh bawaan kita
  if (namedMeshes.Garment_Body && namedMeshes.Print_Front) {
    Object.values(namedMeshes).forEach((geom) => {
      geom.userData.basePositions = new Float32Array(
        geom.attributes.position.array
      )
    })
    return {
      bodyGeometries: [namedMeshes.Garment_Body],
      printMeshes: {
        Print_Front: namedMeshes.Print_Front,
        Print_Back: namedMeshes.Print_Back,
        Print_LeftSleeve: namedMeshes.Print_LeftSleeve,
        Print_RightSleeve: namedMeshes.Print_RightSleeve,
      },
    }
  }

  // Untuk model eksternal seperti "T SHIRT.fbx" dan "oversized_t-shirt.glb"
  const allBodyGeoms =
    bodyGeometries.length > 0
      ? bodyGeometries
      : Object.values(namedMeshes)

  if (allBodyGeoms.length === 0) {
    return { bodyGeometries: [], printMeshes: {} }
  }

  // Hitung bounding box gabungan awal
  const computeCombinedBox = (geoms) => {
    const box = new THREE.Box3()
    geoms.forEach((g) => {
      g.computeBoundingBox()
      if (g.boundingBox) box.union(g.boundingBox)
    })
    return box
  }

  let bbox = computeCombinedBox(allBodyGeoms)
  let size = new THREE.Vector3()
  bbox.getSize(size)

  // Jika model FBX berorientasi Z-up (ketebalan Z jauh lebih panjang daripada tinggi Y), putar ke Y-up
  if (size.z > size.y * 1.35) {
    const rotX = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
    allBodyGeoms.forEach((g) => g.applyMatrix4(rotX))
    bbox = computeCombinedBox(allBodyGeoms)
    bbox.getSize(size)
  }

  const center = new THREE.Vector3()
  bbox.getCenter(center)

  // Pusatkan pada (0, 0, 0) dan skalakan secara proporsional agar pas di kamera studio (target span ~1.92 unit)
  const maxSpan = Math.max(size.x, size.y, size.z, 0.001)
  const targetScale = 1.92 / maxSpan

  const transformMatrix = new THREE.Matrix4()
    .makescale?.(targetScale, targetScale, targetScale) ||
    new THREE.Matrix4().makeScale(targetScale, targetScale, targetScale)
  const translateMatrix = new THREE.Matrix4().makeTranslation(
    -center.x,
    -center.y,
    -center.z
  )

  allBodyGeoms.forEach((g) => {
    g.applyMatrix4(translateMatrix)
    g.applyMatrix4(transformMatrix)
    g.computeVertexNormals()
  })

  const normalizedBox = computeCombinedBox(allBodyGeoms)
  const tempMeshes = allBodyGeoms.map((g) => {
    ensureGeometryUVs(g, normalizedBox)
    g.userData.basePositions = new Float32Array(g.attributes.position.array)
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  })

  const printMeshes = buildRayconformedPrintPatches(tempMeshes, normalizedBox)

  return {
    bodyGeometries: allBodyGeoms,
    printMeshes,
  }
}

/**
 * Periksa apakah path file model 3D benar-benar tersedia di server (bukan HTML fallback).
 */
async function probeModelPath(url) {
  if (!url) return false
  if (url.startsWith('blob:') || url.startsWith('data:')) return true

  try {
    const res = await fetch(encodeURI(url), { method: 'HEAD' })
    if (!res.ok) return false
    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) return false
    return true
  } catch {
    return false
  }
}

/**
 * Muat file .FBX atau .GLB dan kembalikan struktur geometri terstandarisasi.
 */
async function loadPrepared3DModel(url, formatHint = '') {
  const cacheKey = `${url}::${formatHint}`
  if (modelCache.has(cacheKey)) {
    const cached = modelCache.get(cacheKey)
    return {
      bodyGeometries: cached.bodyGeometries.map((g) => {
        const clone = g.clone()
        clone.userData.basePositions = new Float32Array(
          clone.attributes.position.array
        )
        return clone
      }),
      printMeshes: {
        Print_Front: cached.printMeshes.Print_Front?.clone(),
        Print_Back: cached.printMeshes.Print_Back?.clone(),
        Print_LeftSleeve: cached.printMeshes.Print_LeftSleeve?.clone(),
        Print_RightSleeve: cached.printMeshes.Print_RightSleeve?.clone(),
      },
    }
  }

  const isFbx =
    formatHint === 'fbx' || String(url).toLowerCase().endsWith('.fbx')
  const encodedUrl =
    url.startsWith('blob:') || url.startsWith('data:') ? url : encodeURI(url)

  const rawRoot = await new Promise((resolve, reject) => {
    if (isFbx) {
      const loader = new FBXLoader(createSafeLoadingManager())
      loader.load(
        encodedUrl,
        (fbxGroup) => resolve(fbxGroup),
        undefined,
        (err) => reject(err)
      )
    } else {
      const loader = new GLTFLoader(createSafeLoadingManager())
      loader.load(
        encodedUrl,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err)
      )
    }
  })

  const prepared = normalizeAndPrepareModel(rawRoot)
  modelCache.set(cacheKey, prepared)

  return {
    bodyGeometries: prepared.bodyGeometries.map((g) => {
      const clone = g.clone()
      clone.userData.basePositions = new Float32Array(
        clone.attributes.position.array
      )
      return clone
    }),
    printMeshes: {
      Print_Front: prepared.printMeshes.Print_Front?.clone(),
      Print_Back: prepared.printMeshes.Print_Back?.clone(),
      Print_LeftSleeve: prepared.printMeshes.Print_LeftSleeve?.clone(),
      Print_RightSleeve: prepared.printMeshes.Print_RightSleeve?.clone(),
    },
  }
}

function PrintSurfaceTexture({ geometry, src, puffPrint = {} }) {
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
    ? (Number(puffPrint.height) || 0.55) *
      (Number(puffPrint.intensity) || 0.7) *
      0.045
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
  const customModels = useConfiguratorStore((s) => s.customModels)
  const setActiveModelLabel = useConfiguratorStore((s) => s.setActiveModelLabel)

  const effectiveStyle =
    productType === 'hoodie' || garmentStyle === 'hoodie'
      ? 'hoodie'
      : garmentStyle

  const [preparedModel, setPreparedModel] = useState({
    bodyGeometries: [],
    printMeshes: {},
  })

  useEffect(() => {
    let isMounted = true

    const resolveAndLoad = async () => {
      const customEntry = customModels?.[effectiveStyle]
      if (customEntry?.url) {
        try {
          const loaded = await loadPrepared3DModel(
            customEntry.url,
            customEntry.format
          )
          if (isMounted) {
            setPreparedModel(loaded)
            setActiveModelLabel(customEntry.fileName || customEntry.url)
          }
          return
        } catch (err) {
          console.error('Gagal memuat custom model 3D:', err)
        }
      }

      const modelSpec =
        GARMENT_MODELS.find((item) => item.id === effectiveStyle) ||
        GARMENT_MODELS[0]
      const candidates = modelSpec.candidatePaths || [modelSpec.modelPath]

      for (const candidateUrl of candidates) {
        const exists = await probeModelPath(candidateUrl)
        if (!exists) continue

        try {
          const loaded = await loadPrepared3DModel(candidateUrl)
          if (isMounted) {
            setPreparedModel(loaded)
            setActiveModelLabel(candidateUrl.split('/').pop())
          }
          return
        } catch (err) {
          console.warn(`Gagal memuat kandidat model ${candidateUrl}, mencoba fallback:`, err)
        }
      }

      if (modelSpec.fallbackPath) {
        try {
          const loaded = await loadPrepared3DModel(modelSpec.fallbackPath)
          if (isMounted) {
            setPreparedModel(loaded)
            setActiveModelLabel(modelSpec.fallbackPath.split('/').pop())
          }
        } catch (err) {
          console.error('Gagal memuat fallback model 3D:', err)
        }
      }
    }

    resolveAndLoad()

    return () => {
      isMounted = false
    }
  }, [effectiveStyle, customModels, setActiveModelLabel])

  useEffect(() => {
    if (onSceneReady && groupRef.current) {
      onSceneReady(groupRef.current)
    }
  }, [onSceneReady, preparedModel])

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
    const bodyGeoms = preparedModel.bodyGeometries
    if (!group || !bodyGeoms || bodyGeoms.length === 0) return

    const mode = motion?.mode || 'static'
    const isPlaying = motion?.isPlaying !== false
    const speed = Number(motion?.speed) || 1.0
    const t = state.clock.getElapsedTime() * speed

    if (!isPlaying || mode === 'static') {
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      bodyGeoms.forEach((geom) => {
        const posAttr = geom.attributes.position
        const basePos = geom.userData.basePositions
        if (basePos && posAttr) {
          posAttr.array.set(basePos)
          posAttr.needsUpdate = true
        }
      })
      return
    }

    if (mode === 'waves') {
      group.position.set(0, Math.sin(t * 1.6) * 0.015, 0)
      group.rotation.set(0, Math.sin(t * 0.9) * 0.05, 0)

      bodyGeoms.forEach((geom) => {
        const posAttr = geom.attributes.position
        const basePos = geom.userData.basePositions
        if (!basePos || !posAttr) return

        const arr = posAttr.array
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePos[i]
          const by = basePos[i + 1]
          const bz = basePos[i + 2]
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
      })
    } else if (mode === 'walk') {
      const bounce = Math.abs(Math.sin(t * 4.2)) * 0.045
      const sway = Math.sin(t * 2.1) * 0.03
      const twist = Math.sin(t * 4.2) * 0.14
      const tilt = Math.cos(t * 4.2) * 0.035

      group.position.set(sway, bounce - 0.02, 0)
      group.rotation.set(0.04, twist, tilt)

      bodyGeoms.forEach((geom) => {
        const posAttr = geom.attributes.position
        const basePos = geom.userData.basePositions
        if (!basePos || !posAttr) return

        const arr = posAttr.array
        for (let i = 0; i < arr.length; i += 3) {
          const bx = basePos[i]
          const by = basePos[i + 1]
          const bz = basePos[i + 2]
          const armFactor = Math.max(0, (Math.abs(bx) - 0.45) / 0.5)
          const armSwing =
            Math.sin(t * 4.2) * (bx > 0 ? 1 : -1) * 0.09 * armFactor
          arr[i] = bx
          arr[i + 1] = by
          arr[i + 2] = bz + armSwing
        }
        posAttr.needsUpdate = true
      })
    } else if (mode === 'knit') {
      knitProgressRef.current =
        (knitProgressRef.current + delta * 0.45 * speed) % 1.35
      const thresholdY = -1.0 + knitProgressRef.current * 2.2

      group.position.set(0, 0, 0)
      group.rotation.set(0, Math.sin(t * 1.2) * 0.18, 0)

      bodyGeoms.forEach((geom) => {
        const posAttr = geom.attributes.position
        const basePos = geom.userData.basePositions
        if (!basePos || !posAttr) return

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
      })
    }
  })

  const frontSrc =
    sidePreviews?.front || (activeSide === 'front' ? designPreview : null)
  const backSrc =
    sidePreviews?.back || (activeSide === 'back' ? designPreview : null)
  const leftSleeveSrc =
    sidePreviews?.left_sleeve ||
    (activeSide === 'left_sleeve' ? designPreview : null)
  const rightSleeveSrc =
    sidePreviews?.right_sleeve ||
    (activeSide === 'right_sleeve' ? designPreview : null)

  const { printMeshes } = preparedModel

  return (
    <group ref={groupRef}>
      {preparedModel.bodyGeometries.map((geom, index) => (
        <mesh
          key={`body-${index}`}
          name={index === 0 ? 'Garment_Body' : `Garment_Part_${index}`}
          geometry={geom}
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
            wireframe={
              motion?.mode === 'knit' && knitProgressRef.current < 0.25
            }
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {frontSrc && printMeshes?.Print_Front && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`front-${activeSide === 'front' ? designPreviewVersion : 'saved'}`}
            geometry={printMeshes.Print_Front}
            src={frontSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}

      {backSrc && printMeshes?.Print_Back && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`back-${activeSide === 'back' ? designPreviewVersion : 'saved'}`}
            geometry={printMeshes.Print_Back}
            src={backSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}

      {leftSleeveSrc && printMeshes?.Print_LeftSleeve && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`left_sleeve-${activeSide === 'left_sleeve' ? designPreviewVersion : 'saved'}`}
            geometry={printMeshes.Print_LeftSleeve}
            src={leftSleeveSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}

      {rightSleeveSrc && printMeshes?.Print_RightSleeve && (
        <Suspense fallback={null}>
          <PrintSurfaceTexture
            key={`right_sleeve-${activeSide === 'right_sleeve' ? designPreviewVersion : 'saved'}`}
            geometry={printMeshes.Print_RightSleeve}
            src={rightSleeveSrc}
            puffPrint={materialEffects?.puffPrint}
          />
        </Suspense>
      )}
    </group>
  )
}
