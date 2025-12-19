/**
 * Auth context provider and useAuth hook
 * 
 * Manages user authentication state. Token management is delegated to the API client.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser } from '../types/api';
import { api } from '../api/client';

interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    sessionExpired: boolean;
}

interface AuthContextValue extends AuthState {
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        sessionExpired: false,
    });

    const handleAuthFailure = useCallback(() => {
        setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            sessionExpired: true,
        });
    }, []);

    const checkAuth = useCallback(async () => {
        await api.initialize(handleAuthFailure);

        if (!api.hasTokens()) {
            setState({ user: null, isLoading: false, isAuthenticated: false, sessionExpired: false });
            return;
        }

        try {
            const user = await api.getMe();
            setState({ user, isLoading: false, isAuthenticated: true, sessionExpired: false });
        } catch {
            setState({ user: null, isLoading: false, isAuthenticated: false, sessionExpired: false });
        }
    }, [handleAuthFailure]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (identifier: string, password: string) => {
        const response = await api.login(identifier, password);

        setState({
            user: response.user,
            isLoading: false,
            isAuthenticated: true,
            sessionExpired: false,
        });
    }, []);

    const logout = useCallback(async () => {
        await api.logout();
        setState({ user: null, isLoading: false, isAuthenticated: false, sessionExpired: false });
    }, []);

    const clearSessionExpired = useCallback(() => {
        setState(prev => ({ ...prev, sessionExpired: false }));
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, logout, clearSessionExpired }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
