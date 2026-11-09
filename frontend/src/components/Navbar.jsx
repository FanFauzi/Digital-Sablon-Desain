import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">D</span>
        <span>DIGITAL SABLON STUDIO</span>
      </Link>

      <nav className="nav-links">
        <NavLink to="/">Beranda</NavLink>
        <NavLink to="/catalog">Katalog</NavLink>
      </nav>

      <div className="nav-actions">
        <Link to="/catalog" className="nav-button">
          Mulai Desain <span>↗</span>
        </Link>

        {user ? (
          <div className="nav-account">
            <span title={user.email}>{user.name}</span>
            <button type="button" onClick={handleLogout}>Keluar</button>
          </div>
        ) : (
          <Link to="/login" className="nav-login-link">Masuk</Link>
        )}
      </div>
    </header>
  )
}
