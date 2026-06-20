import { useState } from 'react'

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? 'http://localhost:5173'

interface Props {
  onLogin: (email: string, password: string) => Promise<{ error: string | null }>
}

export function LoginScreen({ onLogin }: Props) {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await onLogin(email, password)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: 480,
      background: '#12172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '0.5px solid #111',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26,
            background: '#4B6BF5',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'white',
          }}>M</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', letterSpacing: -0.2 }}>
            Memex
          </span>
        </div>
        <button
          onClick={() => browser.tabs.create({ url: `${DASHBOARD_URL}/auth` })}
          style={{
            background: '#1f2640',
            border: '0.5px solid #1a1a1a',
            borderRadius: 8,
            color: '#aaaaaa',
            fontSize: 10,
            padding: '5px 10px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          Sign up
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        gap: 0,
      }}>

        {/* Icon */}
        <div style={{
          width: 48, height: 48,
          background: '#0d1233',
          border: '0.5px solid #1a1f3a',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="#4B6BF5" strokeWidth="1.5">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', margin: '0 0 4px' }}>
          Sign in to Memex
        </p>
        <p style={{ fontSize: 11, color: '#3a3a3a', margin: '0 0 24px' }}>
          Save this page to your visual library
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
              Email
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#1f2640',
              border: '0.5px solid #1e1e1e',
              borderRadius: 10,
              padding: '0 12px',
              transition: 'border-color 0.15s',
            }}
              onFocus={() => {}}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="#8888a0" strokeWidth="2" style={{ flexShrink: 0, marginRight: 8 }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  color: '#f0f0f0',
                  padding: '9px 0',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, color: '#3a3a3a', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
              Password
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: '#1f2640',
              border: '0.5px solid #1e1e1e',
              borderRadius: 10,
              padding: '0 12px',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="#8888a0" strokeWidth="2" style={{ flexShrink: 0, marginRight: 8 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  color: '#f0f0f0',
                  padding: '9px 0',
                  fontFamily: 'inherit',
                }}
              />
              {/* Show/hide password toggle */}
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: showPass ? '#4B6BF5' : '#8888a0',
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                title={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '0.5px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <p style={{ fontSize: 11, color: '#f87171', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: loading ? '#2a3a7a' : '#4B6BF5',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 13, height: 13,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Signing in...
              </>
            ) : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: 10, color: '#484868', marginTop: 16, textAlign: 'center' }}>
          No account?{' '}
          <button
            onClick={() => browser.tabs.create({ url: `${DASHBOARD_URL}/auth` })}
            style={{
              background: 'none', border: 'none',
              color: '#4B6BF5', cursor: 'pointer',
              fontSize: 10, padding: 0, fontFamily: 'inherit',
            }}
          >
            Create one on the web
          </button>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #666666; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #111 inset;
          -webkit-text-fill-color: #ccc;
        }
      `}</style>
    </div>
  )
}
