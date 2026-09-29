import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(!!token)

  useEffect(() => {
    if (!token) {
      setUser(null)
      setPrograms([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    Promise.all([api.me(), api.myPrograms()])
      .then(([me, progs]) => {
        if (!alive) return
        setUser(me)
        setPrograms(progs)
      })
      .catch(() => {
        if (!alive) return
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        setPrograms([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [token])

  const value = useMemo(
    () => ({
      token,
      user,
      programs,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      async login(username, password) {
        const res = await api.login(username, password)
        localStorage.setItem('token', res.access_token)
        setToken(res.access_token)
      },
      logout() {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        setPrograms([])
      },
      refreshUser: async () => {
        const me = await api.me()
        setUser(me)
        return me
      },
      refreshPrograms: async () => {
        const progs = await api.myPrograms()
        setPrograms(progs)
        return progs
      },
    }),
    [token, user, programs, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider required')
  return ctx
}
