import { useState, useEffect } from 'react'
import { authApi, getToken, setToken, clearToken } from '../lib/api'

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: any }
  | { status: 'unauthenticated' }

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const token = await getToken()

    if (!token) {
      setAuth({ status: 'unauthenticated' })
      return
    }

    const result = await authApi.me()

    if (result.error) {
      await clearToken()
      setAuth({ status: 'unauthenticated' })
      return
    }

    setAuth({ status: 'authenticated', user: result.data.user })
  }

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password)

    if (result.error) {
      return { error: result.error.message }
    }

    await setToken(result.data.token)
    setAuth({ status: 'authenticated', user: result.data.user })
    return { error: null }
  }

  async function logout() {
    await authApi.logout()
    await clearToken()
    setAuth({ status: 'unauthenticated' })
  }

  return { auth, login, logout }
}
