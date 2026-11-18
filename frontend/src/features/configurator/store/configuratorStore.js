import { create } from 'zustand'

export const GARMENT_MODELS = [
  {
    id: 'regular',
    name: 'T-Shirt',
    label: 'T-Shirt',
    fitLabel: 'Tshirt.glb · Regular Fit',
    type: 'tshirt',
    modelPath: '/models/Tshirt.glb',
    candidatePaths: ['/models/Tshirt.glb'],
    description: 'Model T-Shirt GLB untuk kustomisasi desain pada bagian depan, belakang, dan lengan.',
  },
  {
    id: 'hoodie',
    name: 'Classic Hoodie',
    label: 'Classic Hoodie',
    fitLabel: 'hoodie.glb · Pullover',
    type: 'hoodie',
    modelPath: '/models/hoodie.glb',
    candidatePaths: ['/models/hoodie.glb'],
    // Model hoodie terbaru memakai Z untuk lebar dan X untuk kedalaman.
    // ShirtModel mengonversinya ke sumbu standar sebelum membuat permukaan cetak.
    pathOrientations: {
      '/models/hoodie.glb': 'hoodie-sketchfab',
    },
    fallbackPath: '/models/hoodie-classic.glb',
    description: 'Model hoodie GLB untuk kustomisasi desain pada bagian depan, belakang, dan lengan.',
  },
]

export const GARMENT_COLOR_PRESETS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#121212' },
  { name: 'Red', hex: '#E53E3E' },
  { name: 'Blue', hex: '#3182CE' },
  { name: 'Green', hex: '#38A169' },
  { name: 'Yellow', hex: '#D69E2E' },
  { name: 'Grey', hex: '#718096' },
  { name: 'Navy', hex: '#1A365D' },
]

export const PRINT_PLACEMENT_PRESETS = [
  {
    id: 'full_surface',
    code: 'full_surface',
    zone: 'full_surface',
    label: 'Full Surface (Seluruh Kaos)',
    description: 'Desain penuh menutup seluruh permukaan kaos',
    side: null,
    position_x_percent: 50,
    position_y_percent: 50,
    width_percent: 92,
  },
  {
    id: 'front_center',
    code: 'front_center',
    zone: 'front_center',
    label: 'Front Center',
    description: 'Tengah bagian depan dada',
    side: 'front',
    position_x_percent: 50,
    position_y_percent: 44,
    width_percent: 38,
  },
  {
    id: 'front_left_chest',
    code: 'front_left_chest',
    zone: 'front_left_chest',
    label: 'Front Left Chest',
    description: 'Dada kiri (Logo Pocket)',
    side: 'front',
    position_x_percent: 61,
    position_y_percent: 28,
    width_percent: 15,
  },
  {
    id: 'front_right_chest',
    code: 'front_right_chest',
    zone: 'front_right_chest',
    label: 'Front Right Chest',
    description: 'Dada kanan',
    side: 'front',
    position_x_percent: 39,
    position_y_percent: 28,
    width_percent: 15,
  },
  {
    id: 'back_center',
    code: 'back_center',
    zone: 'back_center',
    label: 'Back Center',
    description: 'Tengah bagian belakang',
    side: 'back',
    position_x_percent: 50,
    position_y_percent: 44,
    width_percent: 40,
  },
  {
    id: 'back_upper',
    code: 'back_upper',
    zone: 'back_upper',
    label: 'Back Upper',
    description: 'Punggung atas / bawah kerah',
    side: 'back',
    position_x_percent: 50,
    position_y_percent: 22,
    width_percent: 22,
  },
  {
    id: 'left_sleeve',
    code: 'left_sleeve',
    zone: 'left_sleeve',
    label: 'Left Sleeve',
    description: 'Lengan kiri',
    side: 'left_sleeve',
    position_x_percent: 50,
    position_y_percent: 48,
    width_percent: 55,
  },
  {
    id: 'right_sleeve',
    code: 'right_sleeve',
    zone: 'right_sleeve',
    label: 'Right Sleeve',
    description: 'Lengan kanan',
    side: 'right_sleeve',
    position_x_percent: 50,
    position_y_percent: 48,
    width_percent: 55,
  },
]

export const PRINT_ZONE_PRESETS = PRINT_PLACEMENT_PRESETS

export const FABRIC_TEXTURES = [
  { id: 'cotton', name: 'Cotton Standard', label: 'Cotton Standard', roughness: 0.85, bumpScale: 0.018, weaveScale: 24 },
  { id: 'cotton_combed', name: 'Cotton Combed 30s', label: 'Cotton Combed 30s', roughness: 0.78, bumpScale: 0.012, weaveScale: 34 },
  { id: 'polyester', name: 'Polyester Sport', label: 'Polyester Sport', roughness: 0.52, bumpScale: 0.008, weaveScale: 42 },
  { id: 'fleece', name: 'Heavy Fleece', label: 'Heavy Fleece', roughness: 0.92, bumpScale: 0.028, weaveScale: 18 },
]

const DEFAULT_MATERIAL_EFFECTS = {
  fabricType: 'cotton_combed',
  customFabricTextureUrl: null,
  acidWash: {
    enabled: false,
    intensity: 0.45,
    scale: 2.0,
  },
  puffPrint: {
    enabled: false,
    height: 0.55,
    intensity: 0.7,
    roughness: 0.45,
  },
  lighting: {
    ambientIntensity: 1.25,
    directionalIntensity: 2.1,
    lightAngle: 40,
    shadows: true,
  },
}

const DEFAULT_EXPORT_CONFIG = {
  format: 'png', // 'png' | 'jpg' | 'glb'
  resolution: '1024x1024', // '1024x1024' | '1920x1080' | '2048x2048'
  transparentBg: false,
  transparentBackground: false,
  cameraView: 'current',
  quality: 0.95,
  isExporting: false,
}

export const useConfiguratorStore = create((set) => ({
  activeTab: 'upload', // 'upload' | 'artwork' | 'color' | 'effects' | 'export'
  workspaceMode: 'split', // 'split' (3D + 2D) | '3d' (Full 3D Studio) | '2d' (Full 2D Canvas)
  garmentStyle: 'regular', // 'regular' | 'oversized' | 'hoodie'
  customModels: {}, // { regular: { url, format, fileName }, oversized: { url, format, fileName }, ... }
  activeModelLabel: '',
  surfaceMapping: {
    aspectRatios: {
      front: 0.92,
      back: 0.92,
      left_sleeve: 0.72,
      right_sleeve: 0.72,
    },
    silhouettes: {
      front: null,
      back: null,
      left_sleeve: null,
      right_sleeve: null,
    },
  },
  cameraView: 'front', // 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
  cameraZoom: 1.0,
  cameraResetTrigger: 0,
  materialEffects: structuredClone(DEFAULT_MATERIAL_EFFECTS),
  exportConfig: { ...DEFAULT_EXPORT_CONFIG },

  setActiveTab: (activeTab) => set({ activeTab }),
  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
  setGarmentStyle: (garmentStyle) => set({ garmentStyle }),
  setActiveModelLabel: (activeModelLabel) => set({ activeModelLabel }),
  setSurfaceMapping: (surfaceMapping) => set({ surfaceMapping }),

  setCustomModelForStyle: (styleId, modelInfo) =>
    set((state) => ({
      garmentStyle: styleId,
      customModels: {
        ...state.customModels,
        [styleId]: modelInfo,
      },
    })),

  setCameraView: (cameraView) => set({ cameraView }),
  setCameraZoom: (cameraZoom) =>
    set({ cameraZoom: Math.min(2.0, Math.max(0.6, Number(cameraZoom) || 1.0)) }),
  triggerCameraReset: () =>
    set((state) => ({
      cameraView: 'front',
      cameraZoom: 1.0,
      cameraResetTrigger: state.cameraResetTrigger + 1,
    })),

  setFabricType: (fabricType) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        fabricType,
      },
    })),

  setCustomFabricTextureUrl: (customFabricTextureUrl) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        customFabricTextureUrl,
      },
    })),

  setAcidWash: (patch) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        acidWash: {
          ...state.materialEffects.acidWash,
          ...patch,
        },
      },
    })),

  updateAcidWash: (patch) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        acidWash: {
          ...state.materialEffects.acidWash,
          ...patch,
        },
      },
    })),

  setPuffPrint: (patch) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        puffPrint: {
          ...state.materialEffects.puffPrint,
          ...patch,
        },
      },
    })),

  updatePuffPrint: (patch) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        puffPrint: {
          ...state.materialEffects.puffPrint,
          ...patch,
        },
      },
    })),

  setLighting: (patch) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        lighting: {
          ...state.materialEffects.lighting,
          ...patch,
        },
      },
    })),

  updateLighting: (patch) =>
    set((state) => ({
      materialEffects: {
        ...state.materialEffects,
        lighting: {
          ...state.materialEffects.lighting,
          ...patch,
        },
      },
    })),

  resetMaterialEffects: () =>
    set({ materialEffects: structuredClone(DEFAULT_MATERIAL_EFFECTS) }),

  setExportConfig: (patch) =>
    set((state) => ({
      exportConfig: {
        ...state.exportConfig,
        ...patch,
      },
    })),

  updateExportConfig: (patch) =>
    set((state) => ({
      exportConfig: {
        ...state.exportConfig,
        ...patch,
      },
    })),

  restoreConfiguratorConfig: (savedConfig = {}) =>
    set((state) => ({
      garmentStyle: savedConfig.garment_style || state.garmentStyle,
      materialEffects: savedConfig.material_effects
        ? {
            ...structuredClone(DEFAULT_MATERIAL_EFFECTS),
            ...savedConfig.material_effects,
            acidWash: {
              ...DEFAULT_MATERIAL_EFFECTS.acidWash,
              ...(savedConfig.material_effects.acidWash || {}),
            },
            puffPrint: {
              ...DEFAULT_MATERIAL_EFFECTS.puffPrint,
              ...(savedConfig.material_effects.puffPrint || {}),
            },
            lighting: {
              ...DEFAULT_MATERIAL_EFFECTS.lighting,
              ...(savedConfig.material_effects.lighting || {}),
            },
          }
        : structuredClone(DEFAULT_MATERIAL_EFFECTS),
    })),

  restoreConfiguratorSettings: (savedConfig = {}) =>
    set((state) => ({
      garmentStyle: savedConfig.garment_style || state.garmentStyle,
      materialEffects: savedConfig.material_effects
        ? {
            ...structuredClone(DEFAULT_MATERIAL_EFFECTS),
            ...savedConfig.material_effects,
            acidWash: {
              ...DEFAULT_MATERIAL_EFFECTS.acidWash,
              ...(savedConfig.material_effects.acidWash || {}),
            },
            puffPrint: {
              ...DEFAULT_MATERIAL_EFFECTS.puffPrint,
              ...(savedConfig.material_effects.puffPrint || {}),
            },
            lighting: {
              ...DEFAULT_MATERIAL_EFFECTS.lighting,
              ...(savedConfig.material_effects.lighting || {}),
            },
          }
        : structuredClone(DEFAULT_MATERIAL_EFFECTS),
    })),
}))
