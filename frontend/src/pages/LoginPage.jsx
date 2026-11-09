import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/authContext'

function getErrorMessage(error) {
  return error.response?.data?.errors?.email?.[0]
    || error.response?.data?.message
    || 'Login gagal. Periksa koneksi server dan data akun.'
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
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">DIGITAL SABLON STUDIO</span>
        <h1>Masuk ke akun</h1>
        <p className="auth-description">
          Masuk untuk menyimpan dan membuka proyek desain dari perangkat lain.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}

          <button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="auth-switch">
          Belum punya akun? <Link to="/register">Daftar sekarang</Link>
        </p>
      </section>
    </main>
  )
}
