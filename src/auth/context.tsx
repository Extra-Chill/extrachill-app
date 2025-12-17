/**
 * Auth context provider and useAuth hook
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types/api';
import { api } from '../api/client';
import { getDeviceId, storeTokens, getTokens, clearTokens } from './storage';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    const checkAuth = useCallback(async () => {
        try {
            const { accessToken } = await getTokens();

            if (!accessToken) {
                setState({ user: null, isLoading: false, isAuthenticated: false });
                return;
            }

            const user = await api.getMe(accessToken);
            setState({ user, isLoading: false, isAuthenticated: true });
        } catch {
            await clearTokens();
            setState({ user: null, isLoading: false, isAuthenticated: false });
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (identifier: string, password: string) => {
        const deviceId = await getDeviceId();
        const response = await api.login(identifier, password, deviceId);

        await storeTokens(response.access_token, response.refresh_token);

        setState({
            user: response.user,
            isLoading: false,
            isAuthenticated: true,
        });
    }, []);

    const logout = useCallback(async () => {
        try {
            const { accessToken } = await getTokens();
            const deviceId = await getDeviceId();

            if (accessToken) {
                await api.logout(accessToken, deviceId);
            }
        } catch {
            // Ignore logout errors, clear tokens anyway
        }

        await clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
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
