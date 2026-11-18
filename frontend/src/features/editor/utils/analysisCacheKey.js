export function createAnalysisCacheKey({
  editorId,
  currentSide = 'front',
  shirtType = 'tshirt',
  currentColor = '#ffffff',
}) {
  if (!editorId) return null

  return JSON.stringify([
    editorId,
    currentSide,
    shirtType,
    String(currentColor).toLowerCase(),
  ])
}
