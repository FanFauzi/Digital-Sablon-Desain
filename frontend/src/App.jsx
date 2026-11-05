import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import EditorPage from './pages/EditorPage'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/editor/:shirtId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  )
}