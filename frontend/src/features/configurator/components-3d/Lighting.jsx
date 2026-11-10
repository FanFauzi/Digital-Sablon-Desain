export default function Lighting({ lighting = {} }) {
  const {
    ambientIntensity = 1.25,
    directionalIntensity = 2.1,
    lightAngle = 40,
    shadows = true,
  } = lighting

  const angleRad = ((Number(lightAngle) || 40) * Math.PI) / 180
  const lightX = Math.sin(angleRad) * 4.5
  const lightZ = Math.cos(angleRad) * 4.5

  return (
    <>
      <ambientLight intensity={Number(ambientIntensity) || 1.25} />
      <directionalLight
        position={[lightX, 4.2, lightZ]}
        intensity={Number(directionalIntensity) || 2.1}
        castShadow={Boolean(shadows)}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-lightX * 0.75, 1.8, -lightZ * 0.75]}
        intensity={Math.max(0.35, (Number(directionalIntensity) || 2.1) * 0.38)}
      />
      <hemisphereLight args={['#ffffff', '#b8b8b0', 0.45]} />
    </>
  )
}
