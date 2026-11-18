import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Menu, X, User as UserIcon, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/authContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout().catch(() => {})
    setMobileMenuOpen(false)
    navigate('/', { replace: true })
  }

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <header className="navbar">
      {/* Brand Wordmark & Metadata */}
      <div className="brand-group">
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-mark">DSS</span>
          <div className="brand-text">
            <span className="brand-title">DIGITAL SABLON STUDIO</span>
            <span className="brand-edition">ATELIER · ED. 2026</span>
          </div>
        </Link>
      </div>

      {/* Desktop Main Navigation */}
      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Beranda
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => (isActive ? 'active' : '')}>
          Katalog
        </NavLink>
        <NavLink to="/configurator/1" className={({ isActive }) => (isActive ? 'active' : '')}>
          Studio 3D
        </NavLink>
      </nav>

      {/* Desktop Actions & Account */}
      <div className="nav-actions">
        {user ? (
          <div className="nav-account">
            <div className="nav-user-pill" title={user.email}>
              <UserIcon size={13} className="nav-user-icon" />
              <span className="nav-user-name">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="nav-logout-btn"
              title="Keluar dari akun"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="nav-login-link">
            Masuk
          </Link>
        )}

        <Link to="/catalog" className="nav-button">
          <span>Mulai Desain</span>
          <ArrowUpRight size={15} />
        </Link>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={closeMenu}>
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mobile-drawer-header">
              <span className="eyebrow">DIGITAL SABLON STUDIO</span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={closeMenu}
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mobile-drawer-links">
              <NavLink to="/" end onClick={closeMenu}>
                <span>01</span> Beranda
              </NavLink>
              <NavLink to="/catalog" onClick={closeMenu}>
                <span>02</span> Katalog Koleksi
              </NavLink>
              <NavLink to="/configurator/1" onClick={closeMenu}>
                <span>03</span> Studio 3D
              </NavLink>
            </nav>

            <div className="mobile-drawer-footer">
              {user ? (
                <div className="mobile-user-box">
                  <div className="mobile-user-meta">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <button type="button" onClick={handleLogout} className="mobile-logout-btn">
                    <LogOut size={14} /> Keluar
                  </button>
                </div>
              ) : (
                <Link to="/login" className="mobile-login-btn" onClick={closeMenu}>
                  Masuk ke Akun
                </Link>
              )}

              <Link to="/catalog" className="mobile-cta-btn" onClick={closeMenu}>
                Mulai Kustomisasi 3D <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
