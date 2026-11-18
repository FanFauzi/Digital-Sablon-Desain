import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const image = product.thumbnail
    ? product.thumbnail.startsWith('http')
      ? product.thumbnail
      : `http://127.0.0.1:8000/storage/${product.thumbnail}`
    : null

  return (
    <article className="product-card">
      <div className="product-image">
        {image ? (
          <img src={image} alt={product.name} />
        ) : (
          <div className="image-placeholder">
            <span>{product.type === 'hoodie' ? 'HOODIE' : 'T-SHIRT'}</span>
          </div>
        )}
      </div>

      <div className="product-info">
        <div>
          <span className="product-type">{product.type}</span>
          <h3>{product.name}</h3>
        </div>
        <Link
          to={`/editor/${product.id}`}
          className="product-arrow"
        >
          ↗
        </Link>
        <span className="product-arrow">↗</span>
      </div>
    </article>
  )
}