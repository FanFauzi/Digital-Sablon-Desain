import { create } from 'zustand'

export const GARMENT_MODELS = [
  {
    id: 'regular',
    label: 'Regular T-Shirt',
    type: 'tshirt',
    modelPath: '/models/tshirt-regular.glb',
    description: 'Potongan kaos regular fit klasik untuk harian & produksi komersial.',
  },
  {
    id: 'oversized',
    label: 'Oversized T-Shirt',
    type: 'tshirt',
    modelPath: '/models/tshirt-oversized.glb',
    description: 'Potongan boxy drop-shoulder streetwear dengan area cetak lebih lebar.',
  },
  {
    id: 'hoodie',
    label: 'Classic Hoodie',
    type: 'hoodie',
    modelPath: '/models/hoodie-classic.glb',
    description: 'Hoodie fleece lengkap dengan tudung 3D, kantong kanguru, & lengan panjang.',
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

export const PRINT_ZONE_PRESETS = [
  {
    code: 'front_center',
    label: 'Front Center',
    description: 'Tengah bagian depan',
    side: 'front',
    position_x_percent: 50,
    position_y_percent: 42,
    width_percent: 72,
  },
  {
    code: 'front_left_chest',
    label: 'Front Left Chest',
    description: 'Dada kiri (Logo Pocket)',
    side: 'front',
    position_x_percent: 72,
    position_y_percent: 22,
    width_percent: 25,
  },
  {
    code: 'front_right_chest',
    label: 'Front Right Chest',
    description: 'Dada kanan',
    side: 'front',
    position_x_percent: 28,
    position_y_percent: 22,
    width_percent: 25,
  },
  {
    code: 'back_center',
    label: 'Back Center',
    description: 'Tengah bagian belakang',
    side: 'back',
    position_x_percent: 50,
    position_y_percent: 45,
    width_percent: 78,
  },
  {
    code: 'back_upper',
    label: 'Back Upper',
    description: 'Punggung atas / bawah kerah',
    side: 'back',
    position_x_percent: 50,
    position_y_percent: 18,
    width_percent: 34,
  },
  {
    code: 'left_sleeve',
    label: 'Left Sleeve',
    description: 'Lengan kiri',
    side: 'left_sleeve',
    position_x_percent: 50,
    position_y_percent: 48,
    width_percent: 65,
  },
  {
    code: 'right_sleeve',
    label: 'Right Sleeve',
    description: 'Lengan kanan',
    side: 'right_sleeve',
    position_x_percent: 50,
    position_y_percent: 48,
    width_percent: 65,
  },
]

export const BACKGROUND_PRESETS = [
  { id: 'light_grey', label: 'Studio Light Grey', color: '#E9E9E5', transparent: false },
  { id: 'white', label: 'Pure White', color: '#FFFFFF', transparent: false },
  { id: 'dark', label: 'Dark Studio', color: '#18181B', transparent: false },
  { id: 'warm_sand', label: 'Warm Editorial', color: '#E5DFD3', transparent: false },
  { id: 'transparent', label: 'Transparent Grid', color: 'transparent', transparent: true },
]

export const FABRIC_TEXTURES = [
  { id: 'cotton', label: 'Cotton Standard', roughness: 0.85, bumpScale: 0.018, weaveScale: 24 },
  { id: 'cotton_combed', label: 'Cotton Combed 30s', roughness: 0.78, bumpScale: 0.012, weaveScale: 34 },
  { id: 'polyester', label: 'Polyester Sport', roughness: 0.52, bumpScale: 0.008, weaveScale: 42 },
  { id: 'fleece', label: 'Heavy Fleece', roughness: 0.92, bumpScale: 0.028, weaveScale: 18 },
]

const DEFAULT_BACKGROUND = {
  presetId: 'light_grey',
  color: '#E9E9E5',
  transparent: false,
  customImageUrl: null,
}

const DEFAULT_MATERIAL_EFFECTS = {
  fabricType: 'cotton_combed',
  customFabricTextureUrl: null,
  acidWash: {
    enabled: false,
    intensity: 0.45,
    scale: 3.5,
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

const DEFAULT_MOTION = {
  mode: 'static', // 'static' | 'waves' | 'walk' | 'knit'
  speed: 1.0,
  isPlaying: true,
  cameraAutoRotate: false,
}

const DEFAULT_EXPORT_CONFIG = {
  format: 'png', // 'png' | 'jpg' | 'webm' | 'glb'
  resolution: '1024x1024', // '1024x1024' | '1920x1080' | '2048x2048'
  transparentBackground: false,
  cameraView: 'current', // 'current' | 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
  quality: 0.95,
}

export const useConfiguratorStore = create((set) => ({
  activeTab: 'upload', // 'upload' | 'artwork' | 'color' | 'background' | 'motion' | 'effects' | 'export'
  workspaceMode: 'split', // 'split' (3D + 2D) | '3d' (Full 3D Studio) | '2d' (Full 2D Canvas)
  garmentStyle: 'regular', // 'regular' | 'oversized' | 'hoodie'
  cameraView: 'front', // 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'side_left' | 'side_right'
  cameraZoom: 1.0,
  cameraResetTrigger: 0,

  background: { ...DEFAULT_BACKGROUND },
  materialEffects: structuredClone(DEFAULT_MATERIAL_EFFECTS),
  motion: { ...DEFAULT_MOTION },
  exportConfig: { ...DEFAULT_EXPORT_CONFIG },

  setActiveTab: (activeTab) => set({ activeTab }),
  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
  setGarmentStyle: (garmentStyle) => set({ garmentStyle }),

  setCameraView: (cameraView) => set({ cameraView }),
  setCameraZoom: (cameraZoom) =>
    set({ cameraZoom: Math.min(2.0, Math.max(0.6, Number(cameraZoom) || 1.0)) }),
  triggerCameraReset: () =>
    set((state) => ({
      cameraView: 'front',
      cameraZoom: 1.0,
      cameraResetTrigger: state.cameraResetTrigger + 1,
    })),

  setBackground: (patch) =>
    set((state) => ({
      background: {
        ...state.background,
        ...patch,
      },
    })),

  resetBackground: () => set({ background: { ...DEFAULT_BACKGROUND } }),

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

  resetMaterialEffects: () =>
    set({ materialEffects: structuredClone(DEFAULT_MATERIAL_EFFECTS) }),

  setMotion: (patch) =>
    set((state) => ({
      motion: {
        ...state.motion,
        ...patch,
      },
    })),

  resetMotion: () => set({ motion: { ...DEFAULT_MOTION } }),

  setExportConfig: (patch) =>
    set((state) => ({
      exportConfig: {
        ...state.exportConfig,
        ...patch,
      },
    })),

  restoreConfiguratorSettings: (savedConfig = {}) =>
    set((state) => ({
      garmentStyle: savedConfig.garment_style || state.garmentStyle,
      background: savedConfig.background
        ? { ...DEFAULT_BACKGROUND, ...savedConfig.background }
        : { ...DEFAULT_BACKGROUND },
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
      motion: savedConfig.motion
        ? { ...DEFAULT_MOTION, ...savedConfig.motion }
        : { ...DEFAULT_MOTION },
    })),
}))
