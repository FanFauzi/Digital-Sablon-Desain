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
 * Isi sel grid yang kosong dengan rata-rata tetangga terdekat dan haluskan (smoothing 3x3).
 */
function fillAndSmoothGrid(grid, rows, cols, fallbackValue, isMaxSurface) {
  const filled = Array.from({ length: rows + 1 }, (_, r) =>
    new Float32Array(grid[r])
  )

  // Pass 1 & 2: isi sel yang belum terisi (NaN) dari tetangga terdekat
  for (let pass = 0; pass < 4; pass++) {
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (!Number.isNaN(filled[r][c])) continue
        let sum = 0
        let count = 0
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr
            const nc = c + dc
            if (
              nr >= 0 &&
              nr <= rows &&
              nc >= 0 &&
              nc <= cols &&
              !Number.isNaN(filled[nr][nc])
            ) {
              sum += filled[nr][nc]
              count++
            }
          }
        }
        if (count > 0) {
          filled[r][c] = sum / count
        }
      }
    }
  }

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (Number.isNaN(filled[r][c])) {
        filled[r][c] = fallbackValue
      }
    }
  }

  // Pass 3: 3x3 smoothing + pastikan tidak menembus permukaan asli
  const smoothed = Array.from({ length: rows + 1 }, () =>
    new Float32Array(cols + 1)
  )
  const offset = isMaxSurface ? 0.008 : -0.008

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      let sum = 0
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr <= rows && nc >= 0 && nc <= cols) {
            sum += filled[nr][nc]
            count++
          }
        }
      }
      const avg = sum / count
      smoothed[r][c] = isMaxSurface
        ? Math.max(avg, filled[r][c]) + offset
        : Math.min(avg, filled[r][c]) + offset
    }
  }

  return smoothed
}

/**
 * Menghasilkan 4 permukaan cetak (Front, Back, Left Sleeve, Right Sleeve)
 * secara INSTAN (< 2 milidetik, O(N) tanpa Raycaster lambat) menggunakan Depth-Grid Projection.
 */
function buildFastSurfacePrintPatches(bodyGeometries, bbox) {
  const width = bbox.max.x - bbox.min.x
  const height = bbox.max.y - bbox.min.y
  const depth = bbox.max.z - bbox.min.z

  const torsoCols = 20
  const torsoRows = 24
  const patchW = width * 0.36
  const patchH = height * 0.48
  const centerY = bbox.min.y + height * 0.49
  const minTorsoX = -patchW * 0.5
  const minTorsoY = centerY - patchH * 0.5

  const frontGrid = Array.from({ length: torsoRows + 1 }, () =>
    new Float32Array(torsoCols + 1).fill(NaN)
  )
  const backGrid = Array.from({ length: torsoRows + 1 }, () =>
    new Float32Array(torsoCols + 1).fill(NaN)
  )

  const sleeveCols = 12
  const sleeveRows = 14
  const sleeveCenterY = bbox.min.y + height * 0.65
  const sleeveH = height * 0.2
  const sleeveDepth = Math.max(0.16, depth * 0.55)
  const minSleeveY = sleeveCenterY - sleeveH * 0.5
  const minSleeveZ = -sleeveDepth * 0.5

  const leftSleeveGrid = Array.from({ length: sleeveRows + 1 }, () =>
    new Float32Array(sleeveCols + 1).fill(NaN)
  )
  const rightSleeveGrid = Array.from({ length: sleeveRows + 1 }, () =>
    new Float32Array(sleeveCols + 1).fill(NaN)
  )

  // Single-pass sampling dari vertex buffer (maksimal ~20.000 sampel agar selalu < 2 ms)
  bodyGeometries.forEach((geom) => {
    const pos = geom.attributes.position
    if (!pos) return
    const count = pos.count
    const step = Math.max(1, Math.floor(count / 20000))

    for (let i = 0; i < count; i += step) {
      const vx = pos.getX(i)
      const vy = pos.getY(i)
      const vz = pos.getZ(i)

      // 1. Cek area Torso (Front & Back)
      const normY = ( centerY + patchH * 0.5 - vy ) / patchH
      if (normY >= -0.05 && normY <= 1.05) {
        const r = Math.max(0, Math.min(torsoRows, Math.round(normY * torsoRows)))

        // Front: u dari -patchW/2 ke +patchW/2
        const normFrontX = (vx - minTorsoX) / patchW
        if (normFrontX >= -0.05 && normFrontX <= 1.05 && vz >= 0) {
          const c = Math.max(
            0,
            Math.min(torsoCols, Math.round(normFrontX * torsoCols))
          )
          if (Number.isNaN(frontGrid[r][c]) || vz > frontGrid[r][c]) {
            frontGrid[r][c] = vz
          }
        }

        // Back: u dari +patchW/2 ke -patchW/2
        const normBackX = (patchW * 0.5 - vx) / patchW
        if (normBackX >= -0.05 && normBackX <= 1.05 && vz <= 0) {
          const c = Math.max(
            0,
            Math.min(torsoCols, Math.round(normBackX * torsoCols))
          )
          if (Number.isNaN(backGrid[r][c]) || vz < backGrid[r][c]) {
            backGrid[r][c] = vz
          }
        }
      }

      // 2. Cek area Lengan (Left Sleeve +X & Right Sleeve -X)
      const normSleeveY = (sleeveCenterY + sleeveH * 0.5 - vy) / sleeveH
      if (
        normSleeveY >= -0.05 &&
        normSleeveY <= 1.05 &&
        Math.abs(vx) > width * 0.22
      ) {
        const sr = Math.max(
          0,
          Math.min(sleeveRows, Math.round(normSleeveY * sleeveRows))
        )
        if (vx > 0) {
          const normZ = (sleeveDepth * 0.5 - vz) / sleeveDepth
          if (normZ >= -0.05 && normZ <= 1.05) {
            const sc = Math.max(
              0,
              Math.min(sleeveCols, Math.round(normZ * sleeveCols))
            )
            if (
              Number.isNaN(leftSleeveGrid[sr][sc]) ||
              vx > leftSleeveGrid[sr][sc]
            ) {
              leftSleeveGrid[sr][sc] = vx
            }
          }
        } else {
          const normZ = (vz - minSleeveZ) / sleeveDepth
          if (normZ >= -0.05 && normZ <= 1.05) {
            const sc = Math.max(
              0,
              Math.min(sleeveCols, Math.round(normZ * sleeveCols))
            )
            if (
              Number.isNaN(rightSleeveGrid[sr][sc]) ||
              vx < rightSleeveGrid[sr][sc]
            ) {
              rightSleeveGrid[sr][sc] = vx
            }
          }
        }
      }
    }
  })

  const smoothedFrontZ = fillAndSmoothGrid(
    frontGrid,
    torsoRows,
    torsoCols,
    bbox.max.z * 0.72,
    true
  )
  const smoothedBackZ = fillAndSmoothGrid(
    backGrid,
    torsoRows,
    torsoCols,
    bbox.min.z * 0.72,
    false
  )
  const smoothedLeftX = fillAndSmoothGrid(
    leftSleeveGrid,
    sleeveRows,
    sleeveCols,
    width * 0.36,
    true
  )
  const smoothedRightX = fillAndSmoothGrid(
    rightSleeveGrid,
    sleeveRows,
    sleeveCols,
    -width * 0.36,
    false
  )

  const buildTorsoGeometry = (zGrid, isFront) => {
    const positions = []
    const uvs = []
    for (let r = 0; r <= torsoRows; r++) {
      const v = r / torsoRows
      const y = centerY + patchH * 0.5 - v * patchH
      for (let c = 0; c <= torsoCols; c++) {
        const u = c / torsoCols
        const x = isFront
          ? -patchW * 0.5 + u * patchW
          : patchW * 0.5 - u * patchW
        positions.push(x, y, zGrid[r][c])
        uvs.push(u, 1.0 - v)
      }
    }
    const indices = []
    for (let r = 0; r < torsoRows; r++) {
      for (let c = 0; c < torsoCols; c++) {
        const i0 = r * (torsoCols + 1) + c
        const i1 = i0 + 1
        const i2 = (r + 1) * (torsoCols + 1) + c
        const i3 = i2 + 1
        if (isFront) {
          indices.push(i0, i2, i1, i1, i2, i3)
        } else {
          indices.push(i0, i1, i2, i1, i3, i2)
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

  const buildSleeveGeometry = (xGrid, isLeft) => {
    const positions = []
    const uvs = []
    for (let r = 0; r <= sleeveRows; r++) {
      const v = r / sleeveRows
      const y = sleeveCenterY + sleeveH * 0.5 - v * sleeveH
      for (let c = 0; c <= sleeveCols; c++) {
        const u = c / sleeveCols
        const z = isLeft
          ? sleeveDepth * 0.5 - u * sleeveDepth
          : -sleeveDepth * 0.5 + u * sleeveDepth
        positions.push(xGrid[r][c], y, z)
        uvs.push(u, 1.0 - v)
      }
    }
    const indices = []
    for (let r = 0; r < sleeveRows; r++) {
      for (let c = 0; c < sleeveCols; c++) {
        const i0 = r * (sleeveCols + 1) + c
        const i1 = i0 + 1
        const i2 = (r + 1) * (sleeveCols + 1) + c
        const i3 = i2 + 1
        indices.push(i0, i2, i1, i1, i2, i3)
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
    Print_Front: buildTorsoGeometry(smoothedFrontZ, true),
    Print_Back: buildTorsoGeometry(smoothedBackZ, false),
    Print_LeftSleeve: buildSleeveGeometry(smoothedLeftX, true),
    Print_RightSleeve: buildSleeveGeometry(smoothedRightX, false),
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
    return {
      bodyGeometries: [namedMeshes.Garment_Body],
      totalVertices: namedMeshes.Garment_Body.attributes.position?.count || 0,
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
    return { bodyGeometries: [], totalVertices: 0, printMeshes: {} }
  }

  const computeCombinedBox = (geoms) => {
    const box = new THREE.Box3()
    geoms.forEach((g) => {
      g.computeBoundingBox()
      if (g.boundingBox) box.union(g.boundingBox)
    })
    return box
  }

  let bbox = computeCombinedBox(allBodyGeoms)
  const size = new THREE.Vector3()
  bbox.getSize(size)

  // Jika model FBX berorientasi Z-up, putar ke Y-up
  if (size.z > size.y * 1.35) {
    const rotX = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
    allBodyGeoms.forEach((g) => g.applyMatrix4(rotX))
    bbox = computeCombinedBox(allBodyGeoms)
    bbox.getSize(size)
  }

  const center = new THREE.Vector3()
  bbox.getCenter(center)

  const maxSpan = Math.max(size.x, size.y, size.z, 0.001)
  const targetScale = 1.92 / maxSpan

  const scaleMatrix = new THREE.Matrix4().makeScale(
    targetScale,
    targetScale,
    targetScale
  )
  const translateMatrix = new THREE.Matrix4().makeTranslation(
    -center.x,
    -center.y,
    -center.z
  )

  let totalVertices = 0
  allBodyGeoms.forEach((g) => {
    g.applyMatrix4(translateMatrix)
    g.applyMatrix4(scaleMatrix)
    if (!g.attributes.normal) {
      g.computeVertexNormals()
    }
    totalVertices += g.attributes.position?.count || 0
  })

  const normalizedBox = computeCombinedBox(allBodyGeoms)
  allBodyGeoms.forEach((g) => {
    ensureGeometryUVs(g, normalizedBox)
  })

  const printMeshes = buildFastSurfacePrintPatches(allBodyGeoms, normalizedBox)

  return {
    bodyGeometries: allBodyGeoms,
    totalVertices,
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
    return modelCache.get(cacheKey)
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

  // Hanya simpan basePositions jika jumlah vertex <= 15.000 agar hemat RAM & CPU
  if (prepared.totalVertices <= 15000) {
    prepared.bodyGeometries.forEach((g) => {
      if (g.attributes.position && !g.userData.basePositions) {
        g.userData.basePositions = new Float32Array(
          g.attributes.position.array
        )
      }
    })
  }

  modelCache.set(cacheKey, prepared)
  return prepared
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
  const wasDeformedRef = useRef(false)
  const customModels = useConfiguratorStore((s) => s.customModels)
  const setActiveModelLabel = useConfiguratorStore((s) => s.setActiveModelLabel)

  const effectiveStyle =
    productType === 'hoodie' || garmentStyle === 'hoodie'
      ? 'hoodie'
      : garmentStyle

  const [preparedModel, setPreparedModel] = useState({
    bodyGeometries: [],
    totalVertices: 0,
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
          console.warn(
            `Gagal memuat kandidat model ${candidateUrl}, mencoba fallback:`,
            err
          )
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

  // Animasi real-time 60 FPS yang ringan untuk model high-poly maupun low-poly
  useFrame((state, delta) => {
    const group = groupRef.current
    const bodyGeoms = preparedModel.bodyGeometries
    if (!group || !bodyGeoms || bodyGeoms.length === 0) return

    const mode = motion?.mode || 'static'
    const isPlaying = motion?.isPlaying !== false
    const speed = Number(motion?.speed) || 1.0
    const t = state.clock.getElapsedTime() * speed
    const canDeformVertices = preparedModel.totalVertices <= 15000

    if (!isPlaying || mode === 'static') {
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      group.scale.set(1, 1, 1)

      // Hanya kembalikan posisi vertex SATU KALI saat beralih dari mode animasi ke static
      if (wasDeformedRef.current) {
        bodyGeoms.forEach((geom) => {
          const posAttr = geom.attributes.position
          const basePos = geom.userData.basePositions
          if (basePos && posAttr) {
            posAttr.array.set(basePos)
            posAttr.needsUpdate = true
          }
        })
        wasDeformedRef.current = false
      }
      return
    }

    if (mode === 'waves') {
      group.position.set(0, Math.sin(t * 1.8) * 0.02, 0)
      group.rotation.set(
        Math.sin(t * 1.3) * 0.03,
        Math.sin(t * 0.9) * 0.06,
        Math.cos(t * 1.1) * 0.02
      )
      group.scale.set(
        1 + Math.sin(t * 2.2) * 0.012,
        1 + Math.cos(t * 1.8) * 0.008,
        1 + Math.sin(t * 2.6) * 0.018
      )

      if (canDeformVertices) {
        wasDeformedRef.current = true
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
      }
    } else if (mode === 'walk') {
      const bounce = Math.abs(Math.sin(t * 4.2)) * 0.045
      const sway = Math.sin(t * 2.1) * 0.03
      const twist = Math.sin(t * 4.2) * 0.14
      const tilt = Math.cos(t * 4.2) * 0.035

      group.position.set(sway, bounce - 0.02, 0)
      group.rotation.set(0.04, twist, tilt)
      group.scale.set(1, 1, 1)

      if (canDeformVertices) {
        wasDeformedRef.current = true
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
      }
    } else if (mode === 'knit') {
      knitProgressRef.current =
        (knitProgressRef.current + delta * 0.45 * speed) % 1.35
      const thresholdY = -1.0 + knitProgressRef.current * 2.2

      group.position.set(0, 0, 0)
      group.rotation.set(0, Math.sin(t * 1.2) * 0.18, 0)
      const pulse = 0.94 + Math.min(1, knitProgressRef.current) * 0.06
      group.scale.set(pulse, pulse, pulse)

      if (canDeformVertices) {
        wasDeformedRef.current = true
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
              motion?.mode === 'knit' && knitProgressRef.current < 0.35
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
