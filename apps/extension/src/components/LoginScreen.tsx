import { useState } from 'react'

interface Props {
  onLogin: (email: string, password: string) => Promise<{ error: string | null }>
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await onLogin(email, password)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className="font-semibold text-gray-800 text-lg">Memex</span>
      </div>

      <p className="text-gray-500 text-sm text-center">Sign in to save this page</p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary-500
                     focus:border-transparent placeholder-gray-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-primary-500
                     focus:border-transparent placeholder-gray-400"
        />

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary-500 hover:bg-primary-600
                     disabled:opacity-50 text-white text-sm font-medium
                     rounded-lg transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
