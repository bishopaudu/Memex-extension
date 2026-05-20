import { useAuth } from '../../src/hooks/useAuth'
import { LoginScreen } from '../../src/components/LoginScreen'
import { SaveScreen } from '../../src/components/SaveScreen'

export default function App() {
  const { auth, login, logout } = useAuth()

  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent
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
