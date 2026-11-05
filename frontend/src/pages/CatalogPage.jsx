import { useEffect, useState } from 'react'
import { getShirts } from '../services/shirtService'
import ProductCard from '../components/ProductCard'

export default function CatalogPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getShirts()
        setProducts(data)
      } catch (err) {
        console.error(err)
        setError('Gagal mengambil katalog. Pastikan server Laravel aktif.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return (
    <main className="catalog-page">
      <div className="section-heading">
        <span className="eyebrow">OUR COLLECTION</span>
        <h1>Pilih Produkmu.</h1>
        <p>Pilih pakaian yang ingin kamu kustomisasi.</p>
      </div>

      {loading && <p>Memuat katalog produk...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p>Belum ada produk yang tersedia.</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  )
}