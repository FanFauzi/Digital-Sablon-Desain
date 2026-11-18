const PRINT_SIDES = new Set(['front', 'back', 'left_sleeve', 'right_sleeve'])

export async function syncCameraToPrintSide(viewId, onSelectSide, setCameraView) {
  if (PRINT_SIDES.has(viewId) && typeof onSelectSide === 'function') {
    const switched = await onSelectSide(viewId)

    if (switched) {
      setCameraView(viewId)
    }

    return Boolean(switched)
  }

  setCameraView(viewId)
  return true
}
