import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'
import { ArrowUpRight, Lock, Mail, User, Sparkles, ShieldCheck } from 'lucide-react'

function getErrorMessage(error) {
  const errors = error.response?.data?.errors
  const firstError = errors ? Object.values(errors).flat()[0] : null

  return (
    firstError ||
    error.response?.data?.message ||
    'Pendaftaran gagal. Periksa koneksi server dan data yang dimasukkan.'
  )
}

export default function RegisterPage() {
  const { user, loading, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/catalog" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate('/catalog', { replace: true })
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
            <span className="auth-brand-code">ARCHIVE // REG-02</span>
          </div>

          <div className="auth-brand-center">
            <h2 className="auth-brand-quote">
              “Bergabunglah dengan studio kreatif kustomisasi streetwear digital berakurasi cetak tinggi.”
            </h2>
            <div className="auth-feature-list">
              <div className="auth-feature-row">
                <Sparkles size={14} />
                <span>Simpan proyek desain multi-sisi (Depan, Belakang, Lengan)</span>
              </div>
              <div className="auth-feature-row">
                <ShieldCheck size={14} />
                <span>Rekomendasi penempatan AI & export 300 DPI siap pakai</span>
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
            <span className="eyebrow">CREATE AN ATELIER ACCOUNT</span>
            <h1 className="auth-title">Daftar Akun Baru</h1>
            <p className="auth-subtitle">
              Lengkapi data singkat untuk mulai menyimpan seluruh karya desainmu.
            </p>

            <form className="auth-form-clean" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label htmlFor="reg-name">
                  <span>Nama Lengkap</span>
                  <div className="input-with-icon">
                    <User size={15} className="field-icon" />
                    <input
                      id="reg-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      placeholder="Nama lengkapmu"
                      onChange={(event) => setName(event.target.value)}
                      maxLength={255}
                      required
                    />
                  </div>
                </label>
              </div>

              <div className="auth-input-group">
                <label htmlFor="reg-email">
                  <span>Alamat Email</span>
                  <div className="input-with-icon">
                    <Mail size={15} className="field-icon" />
                    <input
                      id="reg-email"
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
                <label htmlFor="reg-password">
                  <span>Password (Minimal 8 Karakter)</span>
                  <div className="input-with-icon">
                    <Lock size={15} className="field-icon" />
                    <input
                      id="reg-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      placeholder="Minimal 8 karakter"
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                </label>
              </div>

              <div className="auth-input-group">
                <label htmlFor="reg-password-confirm">
                  <span>Konfirmasi Password</span>
                  <div className="input-with-icon">
                    <Lock size={15} className="field-icon" />
                    <input
                      id="reg-password-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={passwordConfirmation}
                      placeholder="Ulangi password"
                      onChange={(event) => setPasswordConfirmation(event.target.value)}
                      minLength={8}
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
                <span>{isSubmitting ? 'Membuat Akun...' : 'Daftar Sekarang'}</span>
                <ArrowUpRight size={15} />
              </button>
            </form>

            <div className="auth-footer-nav">
              <p>
                Sudah memiliki akun?{' '}
                <Link to="/login" className="auth-accent-link">
                  Masuk ke akunmu
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
