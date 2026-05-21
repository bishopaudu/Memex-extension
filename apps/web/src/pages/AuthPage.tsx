import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AuthPage() {
  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const { login, signup } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = mode === 'login'
      ? await login(email, password)
      : await signup(email, password, name)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">

      {/* Background grid pattern */}
      <div className="fixed inset-0 opacity-[0.03]"
           style={{
             backgroundImage: `linear-gradient(#fff 1px, transparent 1px),
                               linear-gradient(90deg, #fff 1px, transparent 1px)`,
             backgroundSize: '40px 40px'
           }} />

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="text-2xl font-bold text-ink-1">Memex</span>
        </div>

        {/* Card */}
        <div className="bg-surface-2 border border-surface-4 rounded-2xl p-8">
          <h1 className="text-base font-semibold text-ink-1 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-xs text-ink-3 mb-6">
            {mode === 'login'
              ? 'Sign in to your visual memory'
              : 'Start building your second brain'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] font-medium text-ink-3 uppercase
                                  tracking-wider mb-1 block">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-3 border border-surface-4
                             rounded-lg text-sm text-ink-1 placeholder-ink-4 outline-none
                             focus:border-brand transition-colors"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-medium text-ink-3 uppercase
                                tracking-wider mb-1 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-surface-3 border border-surface-4
                           rounded-lg text-sm text-ink-1 placeholder-ink-4 outline-none
                           focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-ink-3 uppercase
                                tracking-wider mb-1 block">Password</label>
              <input
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 bg-surface-3 border border-surface-4
                           rounded-lg text-sm text-ink-1 placeholder-ink-4 outline-none
                           focus:border-brand transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-40
                         text-white text-sm font-medium rounded-lg transition-colors mt-1"
            >
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          <p className="text-xs text-ink-4 text-center mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-brand-bright hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center text-[10px] text-ink-5 mt-6">
          Your visual memory for the internet
        </p>
      </div>
    </div>
  )
}
