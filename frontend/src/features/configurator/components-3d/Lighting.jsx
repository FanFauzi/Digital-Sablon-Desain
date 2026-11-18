import * as THREE from 'three'

export default function Lighting({ lighting = {}, garmentColor = '#ffffff' }) {
  const {
    ambientIntensity = 1.25,
    directionalIntensity = 2.1,
    lightAngle = 40,
    shadows = true,
  } = lighting

  const parsedColor = new THREE.Color(garmentColor || '#ffffff')
  const isDarkGarment =
    Math.max(parsedColor.r, parsedColor.g, parsedColor.b) <
    new THREE.Color('#404040').r

  const baseAmbient = Number(ambientIntensity) || 1.25
  const baseDirectional = Number(directionalIntensity) || 2.1
  const angleRad = ((Number(lightAngle) || 40) * Math.PI) / 180
  const lightX = Math.sin(angleRad) * 4.5
  const lightZ = Math.cos(angleRad) * 4.5

  if (isDarkGarment) {
    return (
      <>
        {/* Dedicated black-fabric studio rig: shape, weave, and silhouette lighting. */}
        <ambientLight intensity={Math.max(baseAmbient, 1.7)} />
        <hemisphereLight args={['#ffffff', '#9b9b9b', 0.9]} />

        {/* Main softbox: reveals folds across the chest and upper sleeves. */}
        <directionalLight
          position={[lightX, 5.0, lightZ]}
          intensity={Math.max(baseDirectional, 3.2)}
          castShadow={Boolean(shadows)}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Front fill: lifts shadowed areas without flattening the garment. */}
        <directionalLight
          position={[-lightX * 0.9, 2.6, Math.max(3.8, lightZ)]}
          intensity={1.8}
        />

        {/* Top strip: makes shoulder, collar, and sleeve contours readable. */}
        <directionalLight position={[0, 6.0, 0.8]} intensity={1.35} />

        {/* Side and rear rims: separate the dark garment from the studio background. */}
        <directionalLight position={[-4.5, 2.0, -3.5]} intensity={1.7} />
        <directionalLight position={[4.5, 1.5, -3.5]} intensity={1.45} />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={baseAmbient} />
      <directionalLight
        position={[lightX, 4.2, lightZ]}
        intensity={baseDirectional}
        castShadow={Boolean(shadows)}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-lightX * 0.75, 1.8, -lightZ * 0.75]}
        intensity={Math.max(0.35, baseDirectional * 0.38)}
      />
      <hemisphereLight args={['#ffffff', '#b8b8b0', 0.45]} />
    </>
  )
}
