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

  return (
    <>
      <ambientLight
        intensity={isDarkGarment ? Math.max(baseAmbient, 2.0) : baseAmbient}
      />
      <directionalLight
        position={[lightX, 4.2, lightZ]}
        intensity={isDarkGarment ? Math.max(baseDirectional, 3.0) : baseDirectional}
        castShadow={Boolean(shadows)}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-lightX * 0.75, 1.8, -lightZ * 0.75]}
        intensity={Math.max(0.35, baseDirectional * 0.38)}
      />
      {isDarkGarment && (
        <>
          <directionalLight position={[0.4, 3.0, 5.0]} intensity={1.25} />
          <directionalLight position={[-3.5, 2.4, -3.5]} intensity={1.0} />
        </>
      )}
      <hemisphereLight
        args={['#ffffff', '#b8b8b0', isDarkGarment ? 0.95 : 0.45]}
      />
    </>
  )
}
