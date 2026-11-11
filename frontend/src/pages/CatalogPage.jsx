import { useEffect, useState, useMemo } from 'react'
import { getShirts } from '../services/shirtService'
import ProductCard from '../components/ProductCard'
import { Search, RefreshCw, AlertCircle } from 'lucide-react'

// Fallback catalog aligned with database seeders so preview works even if API is starting
const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'Basic T-Shirt',
    type: 'tshirt',
    description: 'Kaos regular fit berbahan cotton combed 24s untuk kustomisasi sablon dada, punggung, dan lengan.',
    variants: [
      { color_name: 'White', color_hex: '#FFFFFF', size: 'M' },
      { color_name: 'Black', color_hex: '#141413', size: 'M' },
      { color_name: 'Olive', color_hex: '#777B68', size: 'M' },
      { color_name: 'Clay', color_hex: '#B58D7B', size: 'M' },
    ],
  },
  {
    id: 2,
    name: 'Oversized T-Shirt',
    type: 'tshirt',
    description: 'Kaos potongan boxy drop-shoulder streetwear 240 GSM dengan area cetak ekstra lebar.',
    variants: [
      { color_name: 'Black', color_hex: '#141413', size: 'M' },
      { color_name: 'White', color_hex: '#FFFFFF', size: 'M' },
      { color_name: 'Charcoal', color_hex: '#292B29', size: 'M' },
      { color_name: 'Sage', color_hex: '#A8ADA0', size: 'M' },
    ],
  },
  {
    id: 3,
    name: 'Classic Hoodie',
    type: 'hoodie',
    description: 'Hoodie fleece 380 GSM dengan tudung ganda, saku kanguru, dan area cetak punggung penuh.',
    variants: [
      { color_name: 'Black', color_hex: '#141413', size: 'M' },
      { color_name: 'Heather Grey', color_hex: '#808080', size: 'M' },
      { color_name: 'Deep Navy', color_hex: '#1A365D', size: 'M' },
    ],
  },
]

export default function CatalogPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isMounted = true

    getShirts()
      .then((data) => {
        if (!isMounted) return
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data)
        } else {
          setProducts(FALLBACK_PRODUCTS)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('API error, loading fallback atelier catalog:', err)
        setProducts(FALLBACK_PRODUCTS)
        setError('Koneksi ke backend server belum aktif. Menampilkan koleksi offline atelier.')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const reloadProducts = () => {
    setLoading(true)
    setError('')
    getShirts()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data)
        } else {
          setProducts(FALLBACK_PRODUCTS)
        }
      })
      .catch((err) => {
        console.warn('API error, loading fallback atelier catalog:', err)
        setProducts(FALLBACK_PRODUCTS)
        setError('Koneksi ke backend server belum aktif. Menampilkan koleksi offline atelier.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const lowerName = String(product.name || '').toLowerCase()
      const lowerType = String(product.type || '').toLowerCase()
      const matchesSearch =
        lowerName.includes(searchQuery.toLowerCase()) ||
        lowerType.includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (selectedCategory === 'all') return true
      if (selectedCategory === 'oversized') {
        return lowerName.includes('oversize') || lowerType.includes('oversize')
      }
      if (selectedCategory === 'hoodie') {
        return lowerName.includes('hoodie') || lowerType.includes('hoodie')
      }
      if (selectedCategory === 'regular') {
        return (
          (lowerType.includes('tshirt') || lowerType.includes('shirt')) &&
          !lowerName.includes('oversize')
        )
      }
      return true
    })
  }, [products, selectedCategory, searchQuery])

  return (
    <main className="catalog-page">
      {/* Editorial Header */}
      <section className="catalog-header-editorial">
        <div className="catalog-title-col">
          <span className="eyebrow">DROP 01 // ARCHIVE COLLECTION</span>
          <h1 className="catalog-title">Katalog Siluet Pakaian</h1>
          <p className="catalog-description">
            Pilih siluet pakaian streetwear pilihanmu. Setiap produk telah terkalibrasi secara presisi
            dengan model 3D dan siap dikustomisasi di studio kanvas.
          </p>
        </div>

        <div className="catalog-meta-stats">
          <div className="stat-card">
            <span className="stat-num">{products.length}</span>
            <span className="stat-label">Model Siluet Tersedia</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">300</span>
            <span className="stat-label">DPI Standar Cetak</span>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="catalog-toolbar" aria-label="Filter katalog">
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Semua Siluet ({products.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedCategory === 'oversized' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('oversized')}
          >
            Oversized Tee (240 GSM)
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedCategory === 'hoodie' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('hoodie')}
          >
            Classic Hoodie (380 GSM)
          </button>
          <button
            type="button"
            className={`filter-pill ${selectedCategory === 'regular' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('regular')}
          >
            Basic Regular Fit
          </button>
        </div>

        <div className="catalog-search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Cari siluet pakaian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Notice Message if server is offline */}
      {error && (
        <div className="catalog-notice-banner" role="status">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button type="button" onClick={reloadProducts} className="notice-reload-btn">
            <RefreshCw size={12} /> Coba Muat Ulang
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="catalog-skeleton-grid" aria-label="Memuat katalog...">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-card">
              <div className="skeleton-image" />
              <div className="skeleton-line title" />
              <div className="skeleton-line text" />
              <div className="skeleton-line button" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <div className="catalog-empty-state">
          <span className="empty-symbol">∅</span>
          <h3>Tidak ada produk yang cocok</h3>
          <p>Coba gunakan kata kunci pencarian lain atau kembalikan filter ke semua siluet.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all')
              setSearchQuery('')
            }}
            className="btn-empty-reset"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* Product Grid */}
      {!loading && filteredProducts.length > 0 && (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  )
}
