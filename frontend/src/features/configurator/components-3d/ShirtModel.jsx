import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
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
 * Gabungkan seluruh sub-mesh pakaian menjadi satu BufferGeometry terindeks yang bersih
 * agar sablon dapat menempel mulus melintasi dada, bahu, kerah, hingga lengan.
 */
function mergeGeometriesToIndexed(geometries) {
  let totalVerts = 0
  let totalIndices = 0

  geometries.forEach((g) => {
    const pos = g.attributes.position
    if (!pos) return
    if (!g.attributes.normal) {
      g.computeVertexNormals()
    }
    totalVerts += pos.count
    totalIndices += g.index ? g.index.count : pos.count
  })

  const positions = new Float32Array(totalVerts * 3)
  const normals = new Float32Array(totalVerts * 3)
  const uvs = new Float32Array(totalVerts * 2)
  const indices = new Uint32Array(totalIndices)

  let vOffset = 0
  let iOffset = 0

  geometries.forEach((g) => {
    const pos = g.attributes.position
    if (!pos) return
    const norm = g.attributes.normal
    const uv = g.attributes.uv
    const count = pos.count

    for (let i = 0; i < count; i++) {
      const dst3 = (vOffset + i) * 3
      positions[dst3] = pos.getX(i)
      positions[dst3 + 1] = pos.getY(i)
      positions[dst3 + 2] = pos.getZ(i)

      if (norm) {
        normals[dst3] = norm.getX(i)
        normals[dst3 + 1] = norm.getY(i)
        normals[dst3 + 2] = norm.getZ(i)
      }
      if (uv) {
        const dst2 = (vOffset + i) * 2
        uvs[dst2] = uv.getX(i)
        uvs[dst2 + 1] = uv.getY(i)
      }
    }

    if (g.index) {
      const idxArr = g.index.array
      for (let i = 0; i < idxArr.length; i++) {
        indices[iOffset + i] = idxArr[i] + vOffset
      }
      iOffset += idxArr.length
    } else {
      for (let i = 0; i < count; i++) {
        indices[iOffset + i] = vOffset + i
      }
      iOffset += count
    }

    vOffset += count
  })

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  merged.setIndex(new THREE.BufferAttribute(indices, 1))
  return merged
}

/**
 * Ekstrak mesh permukaan cetak (Front, Back, Left Sleeve, Right Sleeve)
 * LANGSUNG dari segitiga asli model 3D (0.0mm celah, 100% menempel mengikuti lipatan kain & tidak pernah melayang keluar siluet).
 * Sekaligus menghasilkan kontur siluet 2D untuk ditampilkan sebagai panduan di 2D Print Area Editor.
 */
function buildExactGarmentSurfaceMeshes(mergedBodyGeom, bbox) {
  const posAttr = mergedBodyGeom.attributes.position
  const normAttr = mergedBodyGeom.attributes.normal
  const indexAttr = mergedBodyGeom.index
  const vertexCount = posAttr.count
  const indexArray = indexAttr.array

  const minX = bbox.min.x
  const maxX = bbox.max.x
  const minY = bbox.min.y
  const maxY = bbox.max.y
  const minZ = bbox.min.z
  const maxZ = bbox.max.z

  const width = Math.max(0.001, maxX - minX)
  const height = Math.max(0.001, maxY - minY)

  // 1. Grid kedalaman Z per sel (X, Y) untuk membedakan dinding luar depan vs dinding luar belakang
  const gridRes = 36
  const cellMinZ = new Float32Array(gridRes * gridRes).fill(Infinity)
  const cellMaxZ = new Float32Array(gridRes * gridRes).fill(-Infinity)

  // Kontur siluet 2D (baris Y dari atas ke bawah) untuk panduan visual di 2D Editor
  const silRows = 44
  const rowMinX = new Float32Array(silRows).fill(Infinity)
  const rowMaxX = new Float32Array(silRows).fill(-Infinity)

  // Batas area lengan kiri (+X) dan lengan kanan (-X)
  const leftSleeveXThreshold = minX + width * 0.64
  const rightSleeveXThreshold = minX + width * 0.36

  let lMinY = Infinity
  let lMaxY = -Infinity
  let lMinZ = Infinity
  let lMaxZ = -Infinity

  let rMinY = Infinity
  let rMaxY = -Infinity
  let rMinZ = Infinity
  let rMaxZ = -Infinity

  // Pastikan UV dasar kain terisi rapi
  const baseUvAttr = mergedBodyGeom.attributes.uv
  let hasNonZeroUv = false
  if (baseUvAttr) {
    for (let i = 0; i < Math.min(vertexCount, 200); i++) {
      if (baseUvAttr.getX(i) !== 0 || baseUvAttr.getY(i) !== 0) {
        hasNonZeroUv = true
        break
      }
    }
  }

  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i)
    const vy = posAttr.getY(i)
    const vz = posAttr.getZ(i)

    const nx = Math.max(
      0,
      Math.min(gridRes - 1, Math.floor(((vx - minX) / width) * gridRes))
    )
    const ny = Math.max(
      0,
      Math.min(gridRes - 1, Math.floor(((vy - minY) / height) * gridRes))
    )
    const cellIdx = ny * gridRes + nx
    if (vz < cellMinZ[cellIdx]) cellMinZ[cellIdx] = vz
    if (vz > cellMaxZ[cellIdx]) cellMaxZ[cellIdx] = vz

    const sRow = Math.max(
      0,
      Math.min(silRows - 1, Math.floor(((maxY - vy) / height) * silRows))
    )
    if (vx < rowMinX[sRow]) rowMinX[sRow] = vx
    if (vx > rowMaxX[sRow]) rowMaxX[sRow] = vx

    if (vx >= leftSleeveXThreshold) {
      if (vy < lMinY) lMinY = vy
      if (vy > lMaxY) lMaxY = vy
      if (vz < lMinZ) lMinZ = vz
      if (vz > lMaxZ) lMaxZ = vz
    } else if (vx <= rightSleeveXThreshold) {
      if (vy < rMinY) rMinY = vy
      if (vy > rMaxY) rMaxY = vy
      if (vz < rMinZ) rMinZ = vz
      if (vz > rMaxZ) rMaxZ = vz
    }

    if (!hasNonZeroUv && baseUvAttr) {
      baseUvAttr.setXY(i, (vx - minX) / width, (vy - minY) / height)
    }
  }

  if (!isfiniteBounds(lMinY, lMaxY)) {
    lMinY = minY + height * 0.45
    lMaxY = maxY - height * 0.08
    lMinZ = minZ
    lMaxZ = maxZ
  }
  if (!isfiniteBounds(rMinY, rMaxY)) {
    rMinY = minY + height * 0.45
    rMaxY = maxY - height * 0.08
    rMinZ = minZ
    rMaxZ = maxZ
  }

  const lHeight = Math.max(0.05, lMaxY - lMinY)
  const lDepth = Math.max(0.05, lMaxZ - lMinZ)
  const rHeight = Math.max(0.05, rMaxY - rMinY)
  const rDepth = Math.max(0.05, rMaxZ - rMinZ)

  // 2. Hitung UV planar [0..1] pada setiap vertex untuk keempat sisi (Front, Back, Left Sleeve, Right Sleeve)
  // Gunakan margin 1.5% (0.015 .. 0.985) agar tepi tekstur dengan ClampToEdgeWrapping bersih sempurna
  const uvFront = new Float32Array(vertexCount * 2)
  const uvBack = new Float32Array(vertexCount * 2)
  const uvLeftSleeve = new Float32Array(vertexCount * 2)
  const uvRightSleeve = new Float32Array(vertexCount * 2)

  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i)
    const vy = posAttr.getY(i)
    const vz = posAttr.getZ(i)
    const idx2 = i * 2

    const uF = 0.015 + ((vx - minX) / width) * 0.97
    const vF = 0.015 + ((vy - minY) / height) * 0.97
    uvFront[idx2] = uF
    uvFront[idx2 + 1] = vF

    const uB = 0.015 + ((maxX - vx) / width) * 0.97
    uvBack[idx2] = uB
    uvBack[idx2 + 1] = vF

    // Left Sleeve (+X): dilihat dari samping kanan kamera (+X), kiri-ke-kanan adalah +Z ke -Z
    const uLS = 0.04 + ((lMaxZ - vz) / lDepth) * 0.92
    const vLS = 0.04 + ((vy - lMinY) / lHeight) * 0.92
    uvLeftSleeve[idx2] = uLS
    uvLeftSleeve[idx2 + 1] = vLS

    // Right Sleeve (-X): dilihat dari samping kiri kamera (-X), kiri-ke-kanan adalah -Z ke +Z
    const uRS = 0.04 + ((vz - rMinZ) / rDepth) * 0.92
    const vRS = 0.04 + ((vy - rMinY) / rHeight) * 0.92
    uvRightSleeve[idx2] = uRS
    uvRightSleeve[idx2 + 1] = vRS
  }

  // 3. Kelompokkan segitiga asli pakaian ke masing-masing permukaan (Front, Back, LeftSleeve, RightSleeve)
  // murni berdasarkan kedalaman lokal (tanpa bergantung pada normalSign yang bisa terbalik pada model double-walled).
  const sleeveGridRes = 24
  const leftSleeveMinXGrid = new Float32Array(sleeveGridRes * sleeveGridRes).fill(Infinity)
  const leftSleeveMaxXGrid = new Float32Array(sleeveGridRes * sleeveGridRes).fill(-Infinity)
  const rightSleeveMinXGrid = new Float32Array(sleeveGridRes * sleeveGridRes).fill(Infinity)
  const rightSleeveMaxXGrid = new Float32Array(sleeveGridRes * sleeveGridRes).fill(-Infinity)

  for (let i = 0; i < vertexCount; i++) {
    const vx = posAttr.getX(i)
    const vy = posAttr.getY(i)
    const vz = posAttr.getZ(i)

    if (vx >= leftSleeveXThreshold * 0.9) {
      const sy = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((vy - lMinY) / lHeight) * sleeveGridRes))
      )
      const sz = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((vz - lMinZ) / lDepth) * sleeveGridRes))
      )
      const sIdx = sy * sleeveGridRes + sz
      if (vx < leftSleeveMinXGrid[sIdx]) leftSleeveMinXGrid[sIdx] = vx
      if (vx > leftSleeveMaxXGrid[sIdx]) leftSleeveMaxXGrid[sIdx] = vx
    } else if (vx <= rightSleeveXThreshold * 0.9) {
      const sy = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((vy - rMinY) / rHeight) * sleeveGridRes))
      )
      const sz = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((vz - rMinZ) / rDepth) * sleeveGridRes))
      )
      const sIdx = sy * sleeveGridRes + sz
      if (vx < rightSleeveMinXGrid[sIdx]) rightSleeveMinXGrid[sIdx] = vx
      if (vx > rightSleeveMaxXGrid[sIdx]) rightSleeveMaxXGrid[sIdx] = vx
    }
  }

  const frontIndices = []
  const backIndices = []
  const leftSleeveIndices = []
  const rightSleeveIndices = []

  for (let i = 0; i < indexArray.length; i += 3) {
    const a = indexArray[i]
    const b = indexArray[i + 1]
    const c = indexArray[i + 2]

    const ax = posAttr.getX(a),
      ay = posAttr.getY(a),
      az = posAttr.getZ(a)
    const bx = posAttr.getX(b),
      by = posAttr.getY(b),
      bz = posAttr.getZ(b)
    const cx = posAttr.getX(c),
      cy = posAttr.getY(c),
      cz = posAttr.getZ(c)

    const midX = (ax + bx + cx) / 3
    const midY = (ay + by + cy) / 3
    const midZ = (az + bz + cz) / 3

    const cellX = Math.max(
      0,
      Math.min(gridRes - 1, Math.floor(((midX - minX) / width) * gridRes))
    )
    const cellY = Math.max(
      0,
      Math.min(gridRes - 1, Math.floor(((midY - minY) / height) * gridRes))
    )
    const cIdx = cellY * gridRes + cellX
    const cMinZ = Number.isFinite(cellMinZ[cIdx]) ? cellMinZ[cIdx] : minZ
    const cMaxZ = Number.isFinite(cellMaxZ[cIdx]) ? cellMaxZ[cIdx] : maxZ
    const cMidZ = (cMinZ + cMaxZ) * 0.5
    const cSpanZ = cMaxZ - cMinZ

    // Segitiga permukaan luar DEPAN (+Z)
    if (
      midZ >= cMidZ - 0.015 &&
      (cSpanZ < 0.045 || midZ >= cMaxZ - Math.max(0.04, cSpanZ * 0.45))
    ) {
      frontIndices.push(a, b, c)
    }

    // Segitiga permukaan luar BELAKANG (-Z)
    if (
      midZ <= cMidZ + 0.015 &&
      (cSpanZ < 0.045 || midZ <= cMinZ + Math.max(0.04, cSpanZ * 0.45))
    ) {
      backIndices.push(a, b, c)
    }

    // Segitiga permukaan luar LENGAN KIRI (+X)
    if (
      midX >= leftSleeveXThreshold * 0.9 &&
      midY >= lMinY - 0.02 &&
      midY <= lMaxY + 0.02
    ) {
      const sy = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((midY - lMinY) / lHeight) * sleeveGridRes))
      )
      const sz = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((midZ - lMinZ) / lDepth) * sleeveGridRes))
      )
      const sIdx = sy * sleeveGridRes + sz
      const sMinX = Number.isFinite(leftSleeveMinXGrid[sIdx])
        ? leftSleeveMinXGrid[sIdx]
        : leftSleeveXThreshold
      const sMaxX = Number.isFinite(leftSleeveMaxXGrid[sIdx])
        ? leftSleeveMaxXGrid[sIdx]
        : maxX
      const sMidX = (sMinX + sMaxX) * 0.5
      if (midX >= sMidX - 0.02) {
        leftSleeveIndices.push(a, b, c)
      }
    }

    // Segitiga permukaan luar LENGAN KANAN (-X)
    if (
      midX <= rightSleeveXThreshold * 0.9 &&
      midY >= rMinY - 0.02 &&
      midY <= rMaxY + 0.02
    ) {
      const sy = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((midY - rMinY) / rHeight) * sleeveGridRes))
      )
      const sz = Math.max(
        0,
        Math.min(sleeveGridRes - 1, Math.floor(((midZ - rMinZ) / rDepth) * sleeveGridRes))
      )
      const sIdx = sy * sleeveGridRes + sz
      const sMinX = Number.isFinite(rightSleeveMinXGrid[sIdx])
        ? rightSleeveMinXGrid[sIdx]
        : minX
      const sMaxX = Number.isFinite(rightSleeveMaxXGrid[sIdx])
        ? rightSleeveMaxXGrid[sIdx]
        : rightSleeveXThreshold
      const sMidX = (sMinX + sMaxX) * 0.5
      if (midX <= sMidX + 0.02) {
        rightSleeveIndices.push(a, b, c)
      }
    }
  }

  /**
   * Bangun BufferGeometry mandiri yang ringkas untuk setiap sisi cetak,
   * dengan offset keluar tipis (3.5 mm pada sumbu pandang) agar 100% bebas Z-fighting
   * terhadap kain tebal/double-walled namun tetap mustahil keluar dari siluet 3D kaos.
   */
  const createCompactPrintGeometry = (uvArray, triIndices, offsetX, offsetY, offsetZ) => {
    const vertexMap = new Int32Array(vertexCount).fill(-1)
    const remappedIndices = new Uint32Array(triIndices.length)
    let compactCount = 0

    for (let i = 0; i < triIndices.length; i++) {
      const origIdx = triIndices[i]
      let mapped = vertexMap[origIdx]
      if (mapped === -1) {
        mapped = compactCount++
        vertexMap[origIdx] = mapped
      }
      remappedIndices[i] = mapped
    }

    const compactPos = new Float32Array(compactCount * 3)
    const compactNorm = new Float32Array(compactCount * 3)
    const compactUv = new Float32Array(compactCount * 2)

    for (let origIdx = 0; origIdx < vertexCount; origIdx++) {
      const mapped = vertexMap[origIdx]
      if (mapped === -1) continue

      const dst3 = mapped * 3
      compactPos[dst3] = posAttr.getX(origIdx) + offsetX
      compactPos[dst3 + 1] = posAttr.getY(origIdx) + offsetY
      compactPos[dst3 + 2] = posAttr.getZ(origIdx) + offsetZ

      if (normAttr) {
        compactNorm[dst3] = normAttr.getX(origIdx)
        compactNorm[dst3 + 1] = normAttr.getY(origIdx)
        compactNorm[dst3 + 2] = normAttr.getZ(origIdx)
      }

      const src2 = origIdx * 2
      const dst2 = mapped * 2
      compactUv[dst2] = uvArray[src2]
      compactUv[dst2 + 1] = uvArray[src2 + 1]
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(compactPos, 3))
    geom.setAttribute('normal', new THREE.BufferAttribute(compactNorm, 3))
    geom.setAttribute('uv', new THREE.BufferAttribute(compactUv, 2))
    geom.setIndex(new THREE.BufferAttribute(remappedIndices, 1))
    geom.computeBoundingBox()
    geom.computeBoundingSphere()
    return geom
  }

  // Bangun poligon siluet 2D terstandarisasi [0..1] untuk panduan di kanvas 2D
  const frontSilhouettePoints = []
  for (let r = 0; r < silRows; r++) {
    if (!Number.isFinite(rowMaxX[r])) continue
    const u = (rowMaxX[r] - minX) / width
    const v = (r + 0.5) / silRows
    frontSilhouettePoints.push({ u, v })
  }
  for (let r = silRows - 1; r >= 0; r--) {
    if (!Number.isFinite(rowMinX[r])) continue
    const u = (rowMinX[r] - minX) / width
    const v = (r + 0.5) / silRows
    frontSilhouettePoints.push({ u, v })
  }

  const backSilhouettePoints = frontSilhouettePoints.map((pt) => ({
    u: 1 - pt.u,
    v: pt.v,
  }))

  return {
    printMeshes: {
      Print_Front: createCompactPrintGeometry(uvFront, frontIndices, 0, 0, 0.0035),
      Print_Back: createCompactPrintGeometry(uvBack, backIndices, 0, 0, -0.0035),
      Print_LeftSleeve: createCompactPrintGeometry(
        uvLeftSleeve,
        leftSleeveIndices,
        0.0035,
        0,
        0
      ),
      Print_RightSleeve: createCompactPrintGeometry(
        uvRightSleeve,
        rightSleeveIndices,
        -0.0035,
        0,
        0
      ),
    },
    surfaceMapping: {
      aspectRatios: {
        front: Number((width / height).toFixed(3)),
        back: Number((width / height).toFixed(3)),
        left_sleeve: Number((lDepth / lHeight).toFixed(3)),
        right_sleeve: Number((rDepth / rHeight).toFixed(3)),
      },
      silhouettes: {
        front: frontSilhouettePoints,
        back: backSilhouettePoints,
        left_sleeve: null,
        right_sleeve: null,
      },
    },
  }
}

function isfiniteBounds(minVal, maxVal) {
  return Number.isFinite(minVal) && Number.isFinite(maxVal) && maxVal > minVal
}

/**
 * Normalisasi skala, posisi tengah, orientasi, dan area cetak untuk model .FBX maupun .GLB.
 */
function normalizeAndPrepareModel(rawRoot) {
  rawRoot.updateMatrixWorld(true)

  const bodyGeometries = []

  rawRoot.traverse((child) => {
    if (!child.isMesh || !child.geometry) return

    // Abaikan sub-mesh bernama Print_* dari GLB lama agar kita selalu membangun
    // permukaan cetak full-surface yang 100% menyatu dengan segitiga Garment_Body.
    if (String(child.name || '').startsWith('Print_')) {
      return
    }

    const geom = child.geometry.clone()
    geom.applyMatrix4(child.matrixWorld)
    bodyGeometries.push(geom)
  })

  if (bodyGeometries.length === 0) {
    return {
      bodyGeometries: [],
      totalVertices: 0,
      printMeshes: {},
      surfaceMapping: null,
    }
  }

  const computeCombinedBox = (geoms) => {
    const box = new THREE.Box3()
    geoms.forEach((g) => {
      g.computeBoundingBox()
      if (g.boundingBox) box.union(g.boundingBox)
    })
    return box
  }

  let bbox = computeCombinedBox(bodyGeometries)
  const size = new THREE.Vector3()
  bbox.getSize(size)

  // Jika model FBX berorientasi Z-up, putar ke Y-up
  if (size.z > size.y * 1.35) {
    const rotX = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
    bodyGeometries.forEach((g) => g.applyMatrix4(rotX))
    bbox = computeCombinedBox(bodyGeometries)
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

  bodyGeometries.forEach((g) => {
    g.applyMatrix4(translateMatrix)
    g.applyMatrix4(scaleMatrix)
  })

  const mergedBodyGeom = mergeGeometriesToIndexed(bodyGeometries)
  mergedBodyGeom.computeBoundingBox()
  mergedBodyGeom.computeBoundingSphere()
  const normalizedBox = mergedBodyGeom.boundingBox
  const totalVertices = mergedBodyGeom.attributes.position?.count || 0

  const { printMeshes, surfaceMapping } = buildExactGarmentSurfaceMeshes(
    mergedBodyGeom,
    normalizedBox
  )

  return {
    bodyGeometries: [mergedBodyGeom],
    totalVertices,
    printMeshes,
    surfaceMapping,
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

  if (prepared.totalVertices <= 15000) {
    const allDeformable = [
      ...prepared.bodyGeometries,
      ...Object.values(prepared.printMeshes || {}),
    ]
    allDeformable.forEach((g) => {
      if (g?.attributes?.position && !g.userData.basePositions) {
        g.userData.basePositions = new Float32Array(
          g.attributes.position.array
        )
      }
    })
  }

  modelCache.set(cacheKey, prepared)
  return prepared
}

/**
 * Bungkus tekstur desain dengan border transparan 2px dan ClampToEdgeWrapping
 * agar sablon tidak pernah bocor/tertarik di luar area UV [0..1].
 */
function createClampedPrintTexture(imageElement) {
  const w = imageElement?.naturalWidth || imageElement?.width || 1024
  const h = imageElement?.naturalHeight || imageElement?.height || 1024

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  if (ctx && imageElement) {
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(imageElement, 2, 2, w - 4, h - 4)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.flipY = true
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

function PrintSurfaceTexture({
  geometry,
  src,
  puffPrint = {},
  fabricBumpMap = null,
  fabricBumpScale = 0.012,
}) {
  const [textures, setTextures] = useState({
    colorTexture: null,
    bumpTexture: null,
  })

  useEffect(() => {
    if (!src) {
      setTextures({ colorTexture: null, bumpTexture: null })
      return undefined
    }

    let isCancelled = false
    let createdColorTex = null
    let createdBumpTex = null

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (isCancelled) return
      createdColorTex = createClampedPrintTexture(img)
      createdBumpTex = puffPrint?.enabled ? createPuffPrintBumpMap(img) : null
      if (createdBumpTex) {
        createdBumpTex.flipY = true
        createdBumpTex.wrapS = THREE.ClampToEdgeWrapping
        createdBumpTex.wrapT = THREE.ClampToEdgeWrapping
        createdBumpTex.needsUpdate = true
      }
      setTextures({
        colorTexture: createdColorTex,
        bumpTexture: createdBumpTex,
      })
    }
    img.src = src

    return () => {
      isCancelled = true
      if (createdColorTex) createdColorTex.dispose()
      if (createdBumpTex) createdBumpTex.dispose()
    }
  }, [src, puffPrint?.enabled])

  if (!textures.colorTexture || !geometry) {
    return null
  }

  const activeBumpMap = puffPrint?.enabled
    ? textures.bumpTexture
    : fabricBumpMap
  const activeBumpScale = puffPrint?.enabled
    ? (Number(puffPrint.height) || 0.55) *
      (Number(puffPrint.intensity) || 0.7) *
      0.045
    : fabricBumpScale

  const roughness = puffPrint?.enabled
    ? Number(puffPrint.roughness) || 0.45
    : 0.72

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshStandardMaterial
        map={textures.colorTexture}
        bumpMap={activeBumpMap || null}
        bumpScale={activeBumpScale}
        roughness={roughness}
        metalness={0.02}
        transparent
        alphaTest={0.02}
        depthWrite
        depthFunc={THREE.LEqualDepth}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
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
  const setSurfaceMapping = useConfiguratorStore((s) => s.setSurfaceMapping)

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

    const applyLoadedModel = (loaded, label) => {
      if (!isMounted) return
      setPreparedModel(loaded)
      setActiveModelLabel(label)
      if (loaded.surfaceMapping) {
        setSurfaceMapping(loaded.surfaceMapping)
      }
    }

    const resolveAndLoad = async () => {
      const customEntry = customModels?.[effectiveStyle]
      if (customEntry?.url) {
        try {
          const loaded = await loadPrepared3DModel(
            customEntry.url,
            customEntry.format
          )
          applyLoadedModel(loaded, customEntry.fileName || customEntry.url)
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
          applyLoadedModel(loaded, candidateUrl.split('/').pop())
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
          applyLoadedModel(loaded, modelSpec.fallbackPath.split('/').pop())
        } catch (err) {
          console.error('Gagal memuat fallback model 3D:', err)
        }
      }
    }

    resolveAndLoad()

    return () => {
      isMounted = false
    }
  }, [effectiveStyle, customModels, setActiveModelLabel, setSurfaceMapping])

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

    const deformableGeoms = [
      ...bodyGeoms,
      ...Object.values(preparedModel.printMeshes || {}),
    ]

    const mode = motion?.mode || 'static'
    const isPlaying = motion?.isPlaying !== false
    const speed = Number(motion?.speed) || 1.0
    const t = state.clock.getElapsedTime() * speed
    const canDeformVertices = preparedModel.totalVertices <= 15000

    if (!isPlaying || mode === 'static') {
      group.position.set(0, 0, 0)
      group.rotation.set(0, 0, 0)
      group.scale.set(1, 1, 1)

      if (wasDeformedRef.current) {
        deformableGeoms.forEach((geom) => {
          const posAttr = geom?.attributes?.position
          const basePos = geom?.userData?.basePositions
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
        deformableGeoms.forEach((geom) => {
          const posAttr = geom?.attributes?.position
          const basePos = geom?.userData?.basePositions
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
        deformableGeoms.forEach((geom) => {
          const posAttr = geom?.attributes?.position
          const basePos = geom?.userData?.basePositions
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
        deformableGeoms.forEach((geom) => {
          const posAttr = geom?.attributes?.position
          const basePos = geom?.userData?.basePositions
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
        <PrintSurfaceTexture
          geometry={printMeshes.Print_Front}
          src={frontSrc}
          puffPrint={materialEffects?.puffPrint}
          fabricBumpMap={fabricBumpMap}
          fabricBumpScale={fabricConfig.bumpScale}
        />
      )}

      {backSrc && printMeshes?.Print_Back && (
        <PrintSurfaceTexture
          geometry={printMeshes.Print_Back}
          src={backSrc}
          puffPrint={materialEffects?.puffPrint}
          fabricBumpMap={fabricBumpMap}
          fabricBumpScale={fabricConfig.bumpScale}
        />
      )}

      {leftSleeveSrc && printMeshes?.Print_LeftSleeve && (
        <PrintSurfaceTexture
          geometry={printMeshes.Print_LeftSleeve}
          src={leftSleeveSrc}
          puffPrint={materialEffects?.puffPrint}
          fabricBumpMap={fabricBumpMap}
          fabricBumpScale={fabricConfig.bumpScale}
        />
      )}

      {rightSleeveSrc && printMeshes?.Print_RightSleeve && (
        <PrintSurfaceTexture
          geometry={printMeshes.Print_RightSleeve}
          src={rightSleeveSrc}
          puffPrint={materialEffects?.puffPrint}
          fabricBumpMap={fabricBumpMap}
          fabricBumpScale={fabricConfig.bumpScale}
        />
      )}
    </group>
  )
}
