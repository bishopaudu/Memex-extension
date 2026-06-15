import { useState, useEffect, createContext, useContext } from 'react';
import { authApi, getToken, setToken, clearToken } from '../lib/api';
// React context so any component can access auth state
// without prop drilling
export const AuthContext = createContext(null);
export function useAuthProvider() {
    const [auth, setAuth] = useState({ status: 'loading' });
    useEffect(() => {
        checkAuth();
    }, []);
    async function checkAuth() {
        const token = getToken();
        if (!token) {
            setAuth({ status: 'unauthenticated' });
            return;
        }
        const result = await authApi.me();
        if (result.error) {
            clearToken();
            setAuth({ status: 'unauthenticated' });
            return;
        }
        setAuth({ status: 'authenticated', user: result.data.user });
    }
    async function login(email, password) {
        const result = await authApi.login(email, password);
        if (result.error)
            return { error: result.error.message };
        setToken(result.data.token);
        setAuth({ status: 'authenticated', user: result.data.user });
        return { error: null };
    }
    async function signup(email, password, name) {
        const result = await authApi.signup(email, password, name);
        if (result.error)
            return { error: result.error.message };
        setToken(result.data.token);
        setAuth({ status: 'authenticated', user: result.data.user });
        return { error: null };
    }
    async function logout() {
        await authApi.logout();
        clearToken();
        setAuth({ status: 'unauthenticated' });
    }
    return { auth, login, signup, logout };
}
// Hook that components use — throws if used outside AuthProvider
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
