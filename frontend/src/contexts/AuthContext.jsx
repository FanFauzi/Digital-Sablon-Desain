import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'dss_access_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      setLoading(false)
      return () => {
        isMounted = false
      }
    }

    api.get('/auth/me')
      .then((response) => {
        if (isMounted) setUser(response.data.data.user)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        if (isMounted) setUser(null)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const acceptSession = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
  }, [])

  const login = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    acceptSession(response.data.data)
    return response.data.data.user
  }, [acceptSession])

  const register = useCallback(async (details) => {
    const response = await api.post('/auth/register', details)
    acceptSession(response.data.data)
    return response.data.data.user
  }, [acceptSession])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  }), [user, loading, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.')
  }

  return context
}
