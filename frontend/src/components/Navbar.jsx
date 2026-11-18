import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
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

      <Link to="/catalog" className="nav-button">
        Mulai Desain <span>↗</span>
      </Link>
    </header>
  )
}