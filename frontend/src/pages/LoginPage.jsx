import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'
import { ArrowUpRight, Lock, Mail, Sparkles, ShieldCheck } from 'lucide-react'

function getErrorMessage(error) {
  return (
    error.response?.data?.errors?.email?.[0] ||
    error.response?.data?.message ||
    'Login gagal. Periksa koneksi server dan data akun.'
  )
}

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/catalog" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await login({ email, password })
      navigate(location.state?.from?.pathname || '/catalog', { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page-editorial">
      <div className="auth-split-container">
        {/* Left Side: Editorial Brand Panel */}
        <section className="auth-brand-panel">
          <div className="auth-brand-top">
            <span className="auth-edition-badge">ATELIER · ED. 2026</span>
            <span className="auth-brand-code">ARCHIVE // AUTH-01</span>
          </div>

          <div className="auth-brand-center">
            <h2 className="auth-brand-quote">
              “Satu akun untuk menyimpan seluruh eksplorasi rancangan 3D, palet warna, dan aset grafis kreasimu.”
            </h2>
            <div className="auth-feature-list">
              <div className="auth-feature-row">
                <Sparkles size={14} />
                <span>Simpan proyek desain lintas perangkat</span>
              </div>
              <div className="auth-feature-row">
                <ShieldCheck size={14} />
                <span>Ekspor file cetak 300 DPI beresolusi tinggi</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-bottom">
            <span>DIGITAL SABLON STUDIO</span>
            <span>JAKARTA · INDONESIA</span>
          </div>
        </section>

        {/* Right Side: Form Panel */}
        <section className="auth-form-panel">
          <div className="auth-form-wrapper">
            <span className="eyebrow">SIGN IN TO CONTINUE</span>
            <h1 className="auth-title">Masuk ke Akun</h1>
            <p className="auth-subtitle">
              Akses kembali proyek kustomisasi pakaian dan riwayat desainmu.
            </p>

            <form className="auth-form-clean" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label htmlFor="login-email">
                  <span>Alamat Email</span>
                  <div className="input-with-icon">
                    <Mail size={15} className="field-icon" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      placeholder="nama@email.com"
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                </label>
              </div>

              <div className="auth-input-group">
                <label htmlFor="login-password">
                  <span>Password</span>
                  <div className="input-with-icon">
                    <Lock size={15} className="field-icon" />
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      placeholder="Masukkan password"
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                </label>
              </div>

              {errorMessage && (
                <div className="auth-error-box" role="alert">
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={isSubmitting || loading}
              >
                <span>{isSubmitting ? 'Memproses Akses...' : 'Masuk ke Studio'}</span>
                <ArrowUpRight size={15} />
              </button>
            </form>

            <div className="auth-footer-nav">
              <p>
                Belum memiliki akun?{' '}
                <Link to="/register" className="auth-accent-link">
                  Daftar akun baru
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
