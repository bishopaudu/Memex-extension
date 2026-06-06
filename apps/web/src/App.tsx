import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'
import { useTheme } from './hooks/useTheme'
import { AuthPage }      from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth()

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

export default function App() {
  const authValue  = useAuthProvider()
  const themeValue = useTheme()

  return (
    <ToastProvider>
    <AuthContext.Provider value={authValue}>
      <Routes>
        <Route
          path="/auth"
          element={<AuthPage theme={themeValue.theme} toggleTheme={themeValue.toggle} />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardPage theme={themeValue.theme} toggleTheme={themeValue.toggle} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthContext.Provider>
    </ToastProvider>
  )
}
