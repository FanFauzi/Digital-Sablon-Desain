import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import GarmentVisual from './GarmentVisual'

export default function ProductCard({ product }) {
  const image = product?.thumbnail
    ? product.thumbnail.startsWith('http')
      ? product.thumbnail
      : `http://127.0.0.1:8000/storage/${product.thumbnail}`
    : null

  // Check both type AND name so "Oversized T-Shirt" with type="tshirt" is detected correctly
  const combinedLabel = `${product?.type || ''} ${product?.name || ''}`.toLowerCase()
  const isHoodie = combinedLabel.includes('hoodie')
  const isOversized = combinedLabel.includes('oversize') || combinedLabel.includes('boxy')

  // Real craftsmanship metadata
  const materialTag = isHoodie
    ? 'FRENCH TERRY · 380 GSM'
    : isOversized
      ? 'HEAVY COMBED · 240 GSM'
      : 'COMBED 24S · 190 GSM'

  const cutTag = isHoodie
    ? 'BOXY DROP HOOD'
    : isOversized
      ? 'DROP SHOULDER · OVERSIZED'
      : 'REGULAR FIT CREW'

  const availableColors = product?.variants
    ? [
        ...new Map(
          product.variants.map((v) => [v.color_hex, v.color_hex])
        ).values(),
      ].slice(0, 5)
    : ['#FFFFFF', '#141413', '#777B68', '#B58D7B']

  return (
    <article className="product-card">
      <Link
        to={`/editor/${product.id}`}
        className="product-card-media-link"
        aria-label={`Kustomisasi ${product.name}`}
      >
        <div className="product-image">
          {isHoodie ? (
            <div
              className="product-sketchfab-preview"
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                background: '#e9e9e5',
              }}
            >
              <iframe
                title="Oversized Hoodie 2 — 3D preview"
                src="https://sketchfab.com/models/bf64214795a04b47a47c4fa29dfe458c/embed?autostart=0&ui_theme=light"
                allow="autoplay; fullscreen; xr-spatial-tracking"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  minHeight: 280,
                  border: 0,
                }}
              />
            </div>
          ) : image ? (
            <img src={image} alt={product.name} loading="lazy" />
          ) : (
            <div className="product-visual-wrapper">
              <GarmentVisual
                type={product?.type || 'tshirt'}
                name={product?.name || ''}
                color="#20211F"
              />
            </div>
          )}

          {/* Badges */}
          <div className="product-badges-top">
            <span className="product-spec-pill">{materialTag}</span>
            <span className="product-badge-3d">
              <Sparkles size={11} /> 3D READY
            </span>
          </div>

          <div className="product-badges-bottom">
            <span className="product-cut-label">{cutTag}</span>
          </div>
        </div>
      </Link>

      <div className="product-info">
        <div className="product-header-block">
          <div className="product-meta-row">
            <span className="product-type">{product?.type || 'Apparel'}</span>
            <span className="product-id-tag">REF. 00{product.id}</span>
          </div>
          <h3 className="product-title">
            <Link to={`/editor/${product.id}`}>{product.name}</Link>
          </h3>
          <p className="product-desc-snippet">
            {product?.description ||
              'Kain katun premium dengan daya serap tinta sablon maksimal dan konstruksi jahitan ganda.'}
          </p>
          {isHoodie && (
            <p className="product-model-credit" style={{ fontSize: 11, color: '#777', marginTop: 8 }}>
              Model 3D oleh{' '}
              <a
                href="https://sketchfab.com/najdmie"
                target="_blank"
                rel="noreferrer noopener"
                onClick={(event) => event.stopPropagation()}
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                najdmie
              </a>
              {' · '}
              <a
                href="https://sketchfab.com/3d-models/oversized-hoodie-2-bf64214795a04b47a47c4fa29dfe458c"
                target="_blank"
                rel="noreferrer noopener"
                onClick={(event) => event.stopPropagation()}
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                Sketchfab
              </a>
            </p>
          )}
        </div>

        {/* Color preview dots */}
        <div className="product-color-dots" aria-label="Warna tersedia">
          {availableColors.map((colorHex, idx) => (
            <span
              key={idx}
              className="color-dot"
              style={{ backgroundColor: colorHex }}
              title={colorHex}
            />
          ))}
          {product?.variants && product.variants.length > 5 && (
            <span className="color-dots-more">+{product.variants.length - 5}</span>
          )}
        </div>

        <div className="product-footer-action">
          <Link
            to={`/editor/${product.id}`}
            className="product-customize-btn"
            aria-label={`Buka studio 3D untuk ${product.name}`}
          >
            <span>Kustomisasi di Studio 3D</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  )
}
