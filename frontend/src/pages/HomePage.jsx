import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">YOUR IDEA, YOUR STYLE</span>

          <h1>
            Design It.
            <br />
            <span>Wear It.</span>
          </h1>

          <p>
            Wujudkan desain pakaian sesuai kreativitasmu.
            Atur desain, dapatkan rekomendasi AI, dan lihat
            hasilnya sebelum dicetak.
          </p>

          <Link to="/catalog" className="primary-button">
            Mulai Kustomisasi <span>↗</span>
          </Link>

          <div className="hero-caption">
            T-SHIRT DESIGN STUDIO · POWERED BY AI
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-circle"></div>
          <div className="hero-shirt">
            <span>YOUR</span>
            <strong>DESIGN.</strong>
          </div>
          <span className="floating-label">MAKE IT YOURS®</span>
        </div>
      </section>

      <section className="feature-section">
        <span className="eyebrow">HOW IT WORKS</span>
        <h2>Dari ide menjadi pakaian.</h2>

        <div className="feature-grid">
          <div><span>01</span><h3>Pilih Produk</h3><p>Tentukan T-Shirt atau Hoodie.</p></div>
          <div><span>02</span><h3>Atur Desain</h3><p>Upload dan sesuaikan desainmu.</p></div>
          <div><span>03</span><h3>AI Recommendation</h3><p>Dapatkan rekomendasi penempatan desain.</p></div>
          <div><span>04</span><h3>Export</h3><p>Unduh hasil desain untuk kebutuhan cetak.</p></div>
        </div>
      </section>
    </main>
  )
}