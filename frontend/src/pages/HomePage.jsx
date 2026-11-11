import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles, Box, Sliders } from 'lucide-react'
import GarmentVisual from '../components/GarmentVisual'

export default function HomePage() {
  return (
    <main className="homepage">
      {/* 1. Announcement Ticker Strip */}
      <section className="announcement-strip" aria-label="Pengumuman Studio">
        <div className="ticker-track">
          <span>ATELIER ED. 2026 // DROP 01</span>
          <span className="ticker-sep">✦</span>
          <span>HEAVYWEIGHT COMBED 240 GSM & FRENCH TERRY 380 GSM</span>
          <span className="ticker-sep">✦</span>
          <span>REALTIME 3D GARMENT CONFIGURATOR</span>
          <span className="ticker-sep">✦</span>
          <span>PRECISION 300 DPI DIRECT-TO-GARMENT EXPORT</span>
          <span className="ticker-sep">✦</span>
          <span>AI-POWERED COMPOSITION & CONTRAST ANALYSIS</span>
          <span className="ticker-sep">✦</span>
          <span>ATELIER ED. 2026 // DROP 01</span>
          <span className="ticker-sep">✦</span>
          <span>HEAVYWEIGHT COMBED 240 GSM & FRENCH TERRY 380 GSM</span>
        </div>
      </section>

      {/* 2. Editorial Hero */}
      <section className="editorial-hero">
        <div className="hero-grid">
          {/* Left Column: Typographic Narrative */}
          <div className="hero-content">
            <div className="hero-meta-badge">
              <span className="badge-dot" />
              <span>DIGITAL SABLON STUDIO · PROTOTYPE ATELIER</span>
            </div>

            <h1 className="hero-headline">
              RAW FORM.
              <br />
              <span className="headline-accent">DIGITAL IDENTITY.</span>
            </h1>

            <p className="hero-lead">
              Platform kustomisasi streetwear generasi baru. Eksplorasi siluet boxy,
              tempatkan karya grafismu di seluruh permukaan pakaian dalam simulasi 3D real-time,
              dan ekspor cetak 300 DPI berstandar industri.
            </p>

            <div className="hero-cta-group">
              <Link to="/catalog" className="btn-hero-primary">
                <span>Eksplorasi Koleksi</span>
                <ArrowUpRight size={17} />
              </Link>
              <Link to="/configurator/1" className="btn-hero-secondary">
                <Box size={16} />
                <span>Buka Studio 3D</span>
              </Link>
            </div>

            <div className="hero-metrics-strip">
              <div className="metric-item">
                <span className="metric-value">300 DPI</span>
                <span className="metric-label">Print Precision</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <span className="metric-value">3D LIVE</span>
                <span className="metric-label">Garment Simulation</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-item">
                <span className="metric-value">AI ASSIST</span>
                <span className="metric-label">Smart Placement</span>
              </div>
            </div>
          </div>

          {/* Right Column: Asymmetric Editorial Visual Showcase */}
          <div className="hero-visual-card">
            <div className="hero-visual-inner">
              <div className="hero-card-header">
                <span className="spec-tag">REF: ARCHIVE-002</span>
                <span className="spec-tag highlight">
                  <Sparkles size={11} /> HEAVYWEIGHT 240 GSM
                </span>
              </div>

              <div className="hero-garment-stage">
                <GarmentVisual
                  type="oversized"
                  name="Oversized Boxy Tee"
                  color="#20211F"
                  className="hero-garment-svg"
                />

                {/* Editorial Callout Badges */}
                <div className="garment-callout callout-shoulder">
                  <span className="callout-dot" />
                  <span className="callout-text">Drop Shoulder Construction</span>
                </div>

                <div className="garment-callout callout-chest">
                  <span className="callout-dot" />
                  <span className="callout-text">32 × 40 CM Full Front Canvas</span>
                </div>
              </div>

              <div className="hero-card-footer">
                <div>
                  <strong>Oversized Streetwear Tee</strong>
                  <p>100% Combed Cotton Heavyweight · Zero Shrinkage</p>
                </div>
                <Link to="/editor/2" className="hero-card-btn" title="Kustomisasi Produk Ini">
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Brand Statement Manifesto */}
      <section className="brand-statement-section">
        <div className="brand-statement-container">
          <span className="eyebrow-center">THE MANIFESTO</span>
          <h2 className="brand-statement-quote">
            “Kami menolak template toko daring yang seragam. Setiap pakaian dirancang sebagai
            kanvas berekspresi: memadukan karakter streetwear independen, siluet arsitektural,
            dan studio 3D digital yang menempatkan kendali kreatif seutuhnya di tanganmu.”
          </h2>
          <div className="brand-statement-author">
            <span>DIGITAL SABLON STUDIO</span>
            <span className="author-dot">/</span>
            <span>JAKARTA · INDONESIA</span>
          </div>
        </div>
      </section>

      {/* 4. Curated Featured Collection */}
      <section className="featured-collection-section">
        <div className="section-header-editorial">
          <div>
            <span className="eyebrow">CURATED SILHOUETTES</span>
            <h2 className="section-title">Koleksi Siluet Utama</h2>
          </div>
          <p className="section-subtitle">
            Fondasi potongan pakaian yang dipersiapkan khusus untuk daya tahan cetak sablon digital
            dan kenyamanan proporsi harian.
          </p>
        </div>

        <div className="editorial-collection-grid">
          {/* Card 1: Oversized Tee */}
          <article className="featured-garment-card">
            <div className="garment-card-top">
              <span className="garment-number">01</span>
              <span className="garment-material-badge">240 GSM COMBED</span>
            </div>
            <div className="garment-card-visual">
              <GarmentVisual type="oversized" name="Oversized" color="#1F201D" />
            </div>
            <div className="garment-card-body">
              <span className="garment-type-label">STREETWEAR SILHOUETTE</span>
              <h3 className="garment-name">Oversized T-Shirt</h3>
              <p className="garment-desc">
                Potongan boxy lebar dengan sambungan bahu menurun (drop shoulder). Area cetak dada
                dan punggung ekstra luas.
              </p>
              <div className="garment-card-action">
                <Link to="/editor/2" className="btn-card-primary">
                  <span>Mulai Kustomisasi</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </article>

          {/* Card 2: Classic Hoodie */}
          <article className="featured-garment-card spotlight">
            <div className="garment-card-top">
              <span className="garment-number">02</span>
              <span className="garment-material-badge highlight">380 GSM FRENCH TERRY</span>
            </div>
            <div className="garment-card-visual">
              <GarmentVisual type="hoodie" name="Hoodie" color="#262724" />
            </div>
            <div className="garment-card-body">
              <span className="garment-type-label">HEAVYWEIGHT FLEECE</span>
              <h3 className="garment-name">Classic Hoodie</h3>
              <p className="garment-desc">
                Tudung ganda kokoh dengan saku kanguru presisi. Mendukung sablon dada, lengan kanan-kiri,
                dan punggung penuh.
              </p>
              <div className="garment-card-action">
                <Link to="/editor/3" className="btn-card-primary">
                  <span>Mulai Kustomisasi</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </article>

          {/* Card 3: Basic Crewneck Tee */}
          <article className="featured-garment-card">
            <div className="garment-card-top">
              <span className="garment-number">03</span>
              <span className="garment-material-badge">190 GSM COMBED 24S</span>
            </div>
            <div className="garment-card-visual">
              <GarmentVisual type="regular" name="Basic" color="#2F312E" />
            </div>
            <div className="garment-card-body">
              <span className="garment-type-label">DAILY ESSENTIAL</span>
              <h3 className="garment-name">Basic Crewneck T-Shirt</h3>
              <p className="garment-desc">
                Potongan reguler klasik dengan rib leher elastis 2.5 cm. Pilihan ideal untuk desain
                tipografi minimalis dan grafis vintage.
              </p>
              <div className="garment-card-action">
                <Link to="/editor/1" className="btn-card-primary">
                  <span>Mulai Kustomisasi</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 5. Customization Studio Architecture Highlight */}
      <section className="studio-feature-section">
        <div className="studio-feature-header">
          <span className="eyebrow">CREATIVE WORKSPACE</span>
          <h2 className="studio-feature-title">Atelier Kustomisasi 3D Interaktif</h2>
          <p className="studio-feature-desc">
            Bukan sekadar form belanja biasa. Studio kreatif terintegrasi untuk desainer,
            brand owner, dan kreator independen.
          </p>
        </div>

        <div className="studio-feature-grid">
          <div className="feature-block">
            <div className="feature-icon-box">
              <Box size={22} />
            </div>
            <span className="feature-step">PILLAR 01</span>
            <h3 className="feature-heading">Simulasi 3D Real-Time</h3>
            <p className="feature-text">
              Putar 360°, ubah sudut kamera (Depan, Belakang, Lengan, Close-up), serta aktifkan
              mode rotasi otomatis untuk memeriksa jatuhnya kain dan proporsi desain secara menyeluruh.
            </p>
          </div>

          <div className="feature-block">
            <div className="feature-icon-box">
              <Sliders size={22} />
            </div>
            <span className="feature-step">PILLAR 02</span>
            <h3 className="feature-heading">Kanvas 2D Akurasi Cetak</h3>
            <p className="feature-text">
              Atur posisi teks, ukuran font, rotasi, layer tumpukan objek, serta batasan area sablon fisik
              dalam centimeter dengan konversi resolusi 300 DPI siap cetak.
            </p>
          </div>

          <div className="feature-block">
            <div className="feature-icon-box">
              <Sparkles size={22} />
            </div>
            <span className="feature-step">PILLAR 03</span>
            <h3 className="feature-heading">Asisten Rekomendasi AI</h3>
            <p className="feature-text">
              Dapatkan rekomendasi proporsi penempatan otomatis (Chest, Back, Pocket), analisis kontras
              warna terhadap kain, dan deteksi peringatan jika desain melewati area cetak aman.
            </p>
          </div>
        </div>

        <div className="studio-cta-bar">
          <div className="studio-cta-text">
            <strong>Siap mewujudkan desain pakaianmu?</strong>
            <span>Pilih produk dari katalog untuk langsung membuka studio kanvas 3D.</span>
          </div>
          <Link to="/catalog" className="btn-studio-cta">
            <span>Buka Katalog & Mulai</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      {/* 6. Technical Craft & Material Specs */}
      <section className="craft-specs-section">
        <div className="craft-specs-grid">
          <div className="craft-content">
            <span className="eyebrow">MATERIAL & PRINT INTEGRITY</span>
            <h2 className="craft-title">Standar Kualitas Tanpa Kompromi</h2>
            <p className="craft-desc">
              Karya desain hebat memerlukan media kain dan teknik sablon berkualitas tinggi.
              Kami menerapkan standar kurasi tekstil ketat sebelum proses pencetakan dilakukan.
            </p>

            <div className="craft-specs-list">
              <div className="craft-spec-item">
                <div className="spec-bullet">01</div>
                <div>
                  <strong>Bahan 100% Ring Spun Combed Cotton</strong>
                  <p>Serat halus anti-bulu, nyaman dipakai pada iklim tropis dengan ketahanan bentuk prima.</p>
                </div>
              </div>

              <div className="craft-spec-item">
                <div className="spec-bullet">02</div>
                <div>
                  <strong>Tinta Pigment Ramah Lingkungan & Tahan Cuci</strong>
                  <p>Hasil cetakan menyerap ke serat kain, tidak kaku, tidak mudah retak, dan tahan puluhan kali pencucian.</p>
                </div>
              </div>

              <div className="craft-spec-item">
                <div className="spec-bullet">03</div>
                <div>
                  <strong>Export File Cetak Beresolusi Tinggi</strong>
                  <p>Hasil akhir dapat diunduh dalam format PNG transparan 300 DPI, GLB 3D, atau simulasi video WebM.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="craft-sidebar-card">
            <div className="craft-card-top">
              <span className="spec-code">SPECIFICATION SHEET</span>
              <span className="spec-status">ACTIVE STANDARD</span>
            </div>

            <div className="craft-table">
              <div className="table-row">
                <span>Fabric Weights</span>
                <strong>190 GSM · 240 GSM · 380 GSM</strong>
              </div>
              <div className="table-row">
                <span>Color Retention</span>
                <strong>Grade 4.5 Washing Fastness</strong>
              </div>
              <div className="table-row">
                <span>Print Resolutions</span>
                <strong>300 DPI Native CMYK / RGB</strong>
              </div>
              <div className="table-row">
                <span>Print Technology</span>
                <strong>High-Precision DTG & Plastisol Curing</strong>
              </div>
              <div className="table-row">
                <span>Garment Cut</span>
                <strong>Oversized Drop Shoulder / Regular Fit</strong>
              </div>
            </div>

            <div className="craft-card-footer">
              <Link to="/catalog" className="btn-craft-action">
                <span>Eksplorasi Katalog</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Editorial Footer */}
      <footer className="editorial-footer">
        <div className="footer-container">
          <div className="footer-top-row">
            <div className="footer-brand-column">
              <div className="footer-brand">
                <span className="footer-brand-mark">DSS</span>
                <strong>DIGITAL SABLON STUDIO</strong>
              </div>
              <p className="footer-brand-desc">
                Studio kustomisasi pakaian streetwear independen berbasis simulasi 3D real-time
                dan asisten kecerdasan buatan.
              </p>
              <div className="footer-location-tag">
                <span>ATELIER EDITION // 2026</span>
              </div>
            </div>

            <div className="footer-links-column">
              <span className="footer-col-title">Navigasi</span>
              <ul>
                <li><Link to="/">Beranda</Link></li>
                <li><Link to="/catalog">Katalog Koleksi</Link></li>
                <li><Link to="/configurator/1">Studio 3D</Link></li>
              </ul>
            </div>

            <div className="footer-links-column">
              <span className="footer-col-title">Siluet Produk</span>
              <ul>
                <li><Link to="/editor/2">Oversized T-Shirt (240 GSM)</Link></li>
                <li><Link to="/editor/3">Classic Hoodie (380 GSM)</Link></li>
                <li><Link to="/editor/1">Basic Crewneck (190 GSM)</Link></li>
              </ul>
            </div>

            <div className="footer-links-column">
              <span className="footer-col-title">Akun & Sesi</span>
              <ul>
                <li><Link to="/login">Masuk ke Akun</Link></li>
                <li><Link to="/register">Daftar Akun Baru</Link></li>
                <li><Link to="/catalog">Proyek Tersimpan</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-row">
            <p className="footer-copyright">
              © {new Date().getFullYear()} DIGITAL SABLON STUDIO. All rights reserved.
            </p>
            <div className="footer-sub-links">
              <span>Modern Experimental Streetwear × Minimalist Editorial</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
