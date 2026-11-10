import ShirtScene from '../../configurator/components-3d/ShirtScene'

export default function ShirtPreview3D({
  color = '#ffffff',
  side = 'front',
  productType = 'tshirt',
  designPreview = null,
  designPreviewVersion = 0,
  sidePreviews = null,
  onSelectSide,
  onWebglCanvasReady,
  onSceneReady,
}) {
  return (
    <div className="shirt-preview-canvas">
      <ShirtScene
        color={color}
        activeSide={side}
        productType={productType}
        designPreview={designPreview}
        designPreviewVersion={designPreviewVersion}
        sidePreviews={sidePreviews || {}}
        onSelectSide={onSelectSide}
        onWebglCanvasReady={onWebglCanvasReady}
        onSceneReady={onSceneReady}
      />
    </div>
  )
}
