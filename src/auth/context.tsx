/**
 * Auth context provider and useAuth hook
 *
 * Manages user authentication state. Token management is delegated to
 * AuthFetchTransport from @extrachill/api-client, with expo-secure-store
 * wired in via src/api/client.ts.
 *
 * Google OAuth is handled by useGoogleAuth() in ./oauth.ts.
 */

// TODO: M7.2.5 will replace this entire file with re-exports from wp-native-shell.

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthMeResponse, OnboardingStatusResponse, OnboardingSubmitResponse } from '../types/api';
import { api, transport } from '../api/client';
import { executeAbility, queryAbility } from '../api/abilities';
import { getDeviceId } from './storage';
import { signOutGoogle } from './oauth';

interface AuthState {
    user: AuthMeResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    sessionExpired: boolean;
    onboardingCompleted: boolean;
}

interface AuthContextValue extends AuthState {
    login: (identifier: string, password: string) => Promise<void>;
    register: (email: string, password: string, passwordConfirm: string) => Promise<{ onboardingCompleted: boolean }>;
    completeOnboarding: (username: string, userIsArtist: boolean, userIsProfessional: boolean) => Promise<void>;
    logout: () => Promise<void>;
    clearSessionExpired: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Parse an access_expires_at ISO string into a Unix timestamp (seconds).
 */
function parseExpiresAt(expiresAt: string): number {
    return Math.floor(new Date(expiresAt).getTime() / 1000);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        sessionExpired: false,
        onboardingCompleted: true,
    });

    const handleAuthFailure = useCallback(() => {
        setState(prev => ({
            ...prev,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            sessionExpired: true,
            onboardingCompleted: true,
        }));
    }, []);

    const checkAuth = useCallback(async () => {
        // Initialize transport (loads stored tokens) and set failure callback
        transport.setOnAuthFailure(handleAuthFailure);
        await transport.initialize();

        if (!transport.hasTokens()) {
            setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                sessionExpired: false,
                onboardingCompleted: true,
            });
            return;
        }

        try {
            const user = await api.auth.me();
            const onboardingStatus = await queryAbility<OnboardingStatusResponse>('extrachill/get-onboarding-status');
            setState({
                user,
                isLoading: false,
                isAuthenticated: true,
                sessionExpired: false,
                onboardingCompleted: onboardingStatus.completed,
            });
        } catch {
            setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                sessionExpired: false,
                onboardingCompleted: true,
            });
        }
    }, [handleAuthFailure]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (identifier: string, password: string) => {
        const deviceId = await getDeviceId();
        const response = await api.auth.login({ identifier, password, device_id: deviceId });

        await transport.setTokens({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            accessExpiresAt: parseExpiresAt(response.access_expires_at),
        });

        const [me, onboardingStatus] = await Promise.all([
            api.auth.me(),
            queryAbility<OnboardingStatusResponse>('extrachill/get-onboarding-status'),
        ]);

        setState(prev => ({
            ...prev,
            user: me,
            isLoading: false,
            isAuthenticated: true,
            sessionExpired: false,
            onboardingCompleted: onboardingStatus.completed,
        }));
    }, []);

    const register = useCallback(async (email: string, password: string, passwordConfirm: string) => {
        const deviceId = await getDeviceId();
        const response = await api.auth.register({
            email,
            password,
            password_confirm: passwordConfirm,
            device_id: deviceId,
            registration_source: 'extrachill-app',
            registration_method: 'standard',
        });

        await transport.setTokens({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            accessExpiresAt: parseExpiresAt(response.access_expires_at),
        });

        const me = await api.auth.me();

        setState(prev => ({
            ...prev,
            user: me,
            isLoading: false,
            isAuthenticated: true,
            sessionExpired: false,
            onboardingCompleted: response.onboarding_completed,
        }));

        return { onboardingCompleted: response.onboarding_completed };
    }, []);

    const completeOnboarding = useCallback(async (
        username: string,
        userIsArtist: boolean,
        userIsProfessional: boolean
    ) => {
        const response = await executeAbility<OnboardingSubmitResponse>('extrachill/complete-onboarding', {
            username,
            user_is_artist: userIsArtist,
            user_is_professional: userIsProfessional,
        });

        setState(prev => ({
            ...prev,
            user: prev.user ? { ...prev.user, username: response.user.username } : null,
            onboardingCompleted: true,
        }));
    }, []);

    const logout = useCallback(async () => {
        // Sign out of Google if module was loaded
        await signOutGoogle();

        try {
            if (transport.hasTokens()) {
                const deviceId = await getDeviceId();
                await api.auth.logout(deviceId);
            }
        } catch {
            // Ignore logout errors, clear tokens anyway
        }

        await transport.clearAuth();
        setState(prev => ({
            ...prev,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            sessionExpired: false,
            onboardingCompleted: true,
        }));
    }, []);

    const clearSessionExpired = useCallback(() => {
        setState(prev => ({ ...prev, sessionExpired: false }));
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const [me, onboardingStatus] = await Promise.all([
                api.auth.me(),
                queryAbility<OnboardingStatusResponse>('extrachill/get-onboarding-status'),
            ]);

            setState(prev => ({
                ...prev,
                user: me,
                isLoading: false,
                isAuthenticated: true,
                sessionExpired: false,
                onboardingCompleted: onboardingStatus.completed,
            }));
        } catch {
            // If refresh fails, leave state unchanged
        }
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, register, completeOnboarding, logout, clearSessionExpired, refreshUser }}>
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
