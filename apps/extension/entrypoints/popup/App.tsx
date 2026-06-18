import { useAuth } from '../../src/hooks/useAuth'
import { LoginScreen } from '../../src/components/LoginScreen'
import { SaveScreen } from '../../src/components/SaveScreen'

export default function App() {
  const { auth, login, logout } = useAuth()

  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[480px] bg-[#0a0a0a]">
        <div className="w-5 h-5 border-2 border-[#4f6ef7] border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return <LoginScreen onLogin={login} />
  }

  return (
    <SaveScreen
      onLogout={logout}
      userEmail={auth.user.email}
    />
  )
}
