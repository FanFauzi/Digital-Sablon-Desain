export function getPlacementFromPreset(placementZone, presets) {
  const preset = presets.find((item) => item.id === placementZone)

  if (!preset) {
    throw new Error('Preset penempatan desain tidak dikenali.')
  }

  return {
    area: preset.side,
    position_code: preset.code || preset.id,
    position_x_percent: preset.position_x_percent,
    position_y_percent: preset.position_y_percent,
    width_percent: preset.width_percent,
  }
}
