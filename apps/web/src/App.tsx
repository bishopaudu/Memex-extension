import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from './hooks/useAuth'
import { AuthPage }      from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { Spinner }       from './components/Spinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth()

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

export default function App() {
  const authValue = useAuthProvider()

  return (
    <AuthContext.Provider value={authValue}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}
