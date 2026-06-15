import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import { useTheme } from './hooks/useTheme';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { PublicTopicPage } from './pages/PublicTopicPage';
import { PublicCollectionPage } from './pages/PublicCollectionPage';
import { AdminPage } from './pages/AdminPage';
import { PublicBookmarkPage } from './pages/PublicBookmarkPage';
import { ExplorePage } from './pages/ExplorePage';
import { HelpPage } from './pages/HelpPage';
import { AboutPage } from './pages/AboutPage';
import { FeedbackPage } from './pages/FeedbackPage';
function ProtectedRoute({ children }) {
    const { auth } = useAuth();
    if (auth.status === 'loading') {
        return (_jsx("div", { className: "min-h-screen bg-surface-0 flex items-center justify-center", children: _jsx("div", { className: "w-5 h-5 border-2 border-brand border-t-transparent\n                        rounded-full animate-spin" }) }));
    }
    if (auth.status === 'unauthenticated') {
        return _jsx(Navigate, { to: "/auth", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
export default function App() {
    const authValue = useAuthProvider();
    const themeValue = useTheme();
    return (_jsx(ToastProvider, { children: _jsx(AuthContext.Provider, { value: authValue, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/auth", element: _jsx(AuthPage, { theme: themeValue.theme, toggleTheme: themeValue.toggle }) }), _jsx(Route, { path: "/p/:username", element: _jsx(PublicProfilePage, {}) }), _jsx(Route, { path: "/p/:username/topic/:slug", element: _jsx(PublicTopicPage, {}) }), _jsx(Route, { path: "/p/:username/collection/:slug", element: _jsx(PublicCollectionPage, {}) }), _jsx(Route, { path: "/p/b/:slug", element: _jsx(PublicBookmarkPage, {}) }), _jsx(Route, { path: "/explore", element: _jsx(ExplorePage, {}) }), _jsx(Route, { path: "/help", element: _jsx(HelpPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutPage, {}) }), _jsx(Route, { path: "/feedback", element: _jsx(FeedbackPage, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminPage, {}) }), _jsx(Route, { path: "/*", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, { theme: themeValue.theme, toggleTheme: themeValue.toggle }) }) })] }) }) }));
}
