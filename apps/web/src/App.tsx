import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/Toast'
import { useTheme } from './hooks/useTheme'
import { AuthPage }      from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { PublicTopicPage } from './pages/PublicTopicPage'
import { PublicCollectionPage } from './pages/PublicCollectionPage'
import { AdminPage } from './pages/AdminPage'
import { PublicBookmarkPage } from './pages/PublicBookmarkPage'
import { ExplorePage } from './pages/ExplorePage'
import { HelpPage }             from './pages/HelpPage'
import { AboutPage }            from './pages/AboutPage'
import { FeedbackPage }         from './pages/FeedbackPage'
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

  return (
    <ToastProvider>
    <AuthContext.Provider value={authValue}>
      <Routes>
        <Route path="/auth" element={<AuthPage />}/>
          <Route path="/p/:username" element={<PublicProfilePage />} />
        <Route path="/p/:username/topic/:slug"      element={<PublicTopicPage />} />
        <Route path="/p/:username/collection/:slug" element={<PublicCollectionPage />} />
          <Route path="/p/b/:slug" element={<PublicBookmarkPage />} />
  <Route path="/explore" element={<ExplorePage />} />
   <Route path="/help"                            element={<HelpPage />} />
        <Route path="/about"                           element={<AboutPage />} />
        <Route path="/feedback"                        element={<FeedbackPage />} />
        <Route path="/admin" element={<AdminPage />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthContext.Provider>
    </ToastProvider>
  )
}
