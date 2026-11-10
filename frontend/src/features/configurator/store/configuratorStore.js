import { create } from 'zustand'

export const GARMENT_MODELS = [
  {
    id: 'regular',
    name: 'Regular T-Shirt',
    label: 'Regular T-Shirt',
    fitLabel: 'Regular Fit · Crewneck',
    type: 'tshirt',
    modelPath: '/models/tshirt-regular.glb',
    description: 'Potongan kaos regular fit klasik untuk harian & produksi komersial.',
  },
  {
    id: 'oversized',
    name: 'Oversized T-Shirt',
    label: 'Oversized T-Shirt',
    fitLabel: 'Boxy Drop-Shoulder',
    type: 'tshirt',
    modelPath: '/models/tshirt-oversized.glb',
    description: 'Potongan boxy drop-shoulder streetwear dengan area cetak lebih lebar.',
  },
  {
    id: 'hoodie',
    name: 'Classic Hoodie',
    label: 'Classic Hoodie',
    fitLabel: 'Heavyweight Pullover',
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

export const PRINT_PLACEMENT_PRESETS = [
  {
    id: 'front_center',
    code: 'front_center',
    zone: 'front_center',
    label: 'Front Center',
    description: 'Tengah bagian depan',
    side: 'front',
    position_x_percent: 50,
    position_y_percent: 42,
    width_percent: 72,
  },
  {
    id: 'front_left_chest',
    code: 'front_left_chest',
    zone: 'front_left_chest',
    label: 'Front Left Chest',
    description: 'Dada kiri (Logo Pocket)',
    side: 'front',
    position_x_percent: 72,
    position_y_percent: 22,
    width_percent: 25,
  },
  {
    id: 'front_right_chest',
    code: 'front_right_chest',
    zone: 'front_right_chest',
    label: 'Front Right Chest',
    description: 'Dada kanan',
    side: 'front',
    position_x_percent: 28,
    position_y_percent: 22,
    width_percent: 25,
  },
  {
    id: 'back_center',
    code: 'back_center',
    zone: 'back_center',
    label: 'Back Center',
    description: 'Tengah bagian belakang',
    side: 'back',
    position_x_percent: 50,
    position_y_percent: 45,
    width_percent: 78,
  },
  {
    id: 'back_upper',
    code: 'back_upper',
    zone: 'back_upper',
    label: 'Back Upper',
    description: 'Punggung atas / bawah kerah',
    side: 'back',
    position_x_percent: 50,
    position_y_percent: 18,
    width_percent: 34,
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
    width_percent: 65,
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
    width_percent: 65,
  },
]

export const PRINT_ZONE_PRESETS = PRINT_PLACEMENT_PRESETS

export const BACKGROUND_PRESETS = [
  { id: 'light_grey', name: 'Studio Light Grey', label: 'Studio Light Grey', color: '#E9E9E5', transparent: false },
  { id: 'white', name: 'Pure White', label: 'Pure White', color: '#FFFFFF', transparent: false },
  { id: 'dark', name: 'Dark Studio', label: 'Dark Studio', color: '#18181B', transparent: false },
  { id: 'warm_sand', name: 'Warm Editorial', label: 'Warm Editorial', color: '#E5DFD3', transparent: false },
  { id: 'transparent', name: 'Transparent Grid', label: 'Transparent Grid', color: 'transparent', transparent: true },
]

export const FABRIC_TEXTURES = [
  { id: 'cotton', name: 'Cotton Standard', label: 'Cotton Standard', roughness: 0.85, bumpScale: 0.018, weaveScale: 24 },
  { id: 'cotton_combed', name: 'Cotton Combed 30s', label: 'Cotton Combed 30s', roughness: 0.78, bumpScale: 0.012, weaveScale: 34 },
  { id: 'polyester', name: 'Polyester Sport', label: 'Polyester Sport', roughness: 0.52, bumpScale: 0.008, weaveScale: 42 },
  { id: 'fleece', name: 'Heavy Fleece', label: 'Heavy Fleece', roughness: 0.92, bumpScale: 0.028, weaveScale: 18 },
]

export const MOTION_MODES = [
  {
    id: 'static',
    name: 'Static (Diam)',
    label: 'Static (Diam)',
    description: 'Posisi kaos statis standar untuk inspeksi detail sablon.',
  },
  {
    id: 'waves',
    name: 'Waves (Angin)',
    label: 'Waves (Angin)',
    description: 'Simulasi alunan gelombang kain terkena hembusan angin.',
  },
  {
    id: 'walk',
    name: 'Walk (Langkah)',
    label: 'Walk (Langkah)',
    description: 'Simulasi ritme gerakan pakaian saat dikenakan berjalan.',
  },
  {
    id: 'knit',
    name: 'Knit (Rajutan)',
    label: 'Knit (Rajutan)',
    description: 'Visualisasi pembentukan struktur serat rajutan kain 3D.',
  },
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

const DEFAULT_MOTION = {
  mode: 'static', // 'static' | 'waves' | 'walk' | 'knit'
  speed: 1.0,
  isPlaying: true,
  cameraAutoRotate: false,
}

const DEFAULT_EXPORT_CONFIG = {
  format: 'png', // 'png' | 'jpg' | 'video' | 'glb'
  resolution: '1024x1024', // '1024x1024' | '1920x1080' | '2048x2048'
  transparentBg: false,
  transparentBackground: false,
  cameraView: 'current',
  quality: 0.95,
  isExporting: false,
}

export const useConfiguratorStore = create((set) => ({
  activeTab: 'upload', // 'upload' | 'artwork' | 'color' | 'background' | 'motion' | 'effects' | 'export'
  workspaceMode: 'split', // 'split' (3D + 2D) | '3d' (Full 3D Studio) | '2d' (Full 2D Canvas)
  garmentStyle: 'regular', // 'regular' | 'oversized' | 'hoodie'
  cameraView: 'front', // 'front' | 'back' | 'left_sleeve' | 'right_sleeve'
  cameraZoom: 1.0,
  cameraResetTrigger: 0,
  autoRotate: false,

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
      autoRotate: false,
      motion: { ...state.motion, cameraAutoRotate: false },
      cameraResetTrigger: state.cameraResetTrigger + 1,
    })),

  toggleAutoRotate: () =>
    set((state) => {
      const next = !state.autoRotate
      return {
        autoRotate: next,
        motion: { ...state.motion, cameraAutoRotate: next },
      }
    }),

  setBackground: (patch) =>
    set((state) => ({
      background: {
        ...state.background,
        ...patch,
      },
    })),

  setBackgroundPreset: (presetId) =>
    set(() => {
      const found =
        BACKGROUND_PRESETS.find((p) => p.id === presetId) || BACKGROUND_PRESETS[0]
      return {
        background: {
          presetId: found.id,
          color: found.color,
          transparent: Boolean(found.transparent),
          customImageUrl: null,
        },
      }
    }),

  setCustomBackgroundColor: (color) =>
    set(() => ({
      background: {
        presetId: 'custom',
        color,
        transparent: false,
        customImageUrl: null,
      },
    })),

  setCustomBackgroundImage: (customImageUrl) =>
    set((state) => ({
      background: {
        ...state.background,
        presetId: 'custom_image',
        transparent: false,
        customImageUrl,
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

  setMotion: (patch) =>
    set((state) => ({
      motion: {
        ...state.motion,
        ...patch,
      },
    })),

  setMotionMode: (mode) =>
    set((state) => ({
      motion: {
        ...state.motion,
        mode,
        isPlaying: mode !== 'static',
      },
    })),

  setMotionSpeed: (speed) =>
    set((state) => ({
      motion: {
        ...state.motion,
        speed: Math.max(0.25, Math.min(2.5, Number(speed) || 1.0)),
      },
    })),

  toggleMotionPlaying: () =>
    set((state) => ({
      motion: {
        ...state.motion,
        isPlaying: !state.motion.isPlaying,
      },
    })),

  resetMotion: () =>
    set({
      autoRotate: false,
      motion: { ...DEFAULT_MOTION },
    }),

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
