/**
 * Auth context provider and useAuth hook
 *
 * Manages user authentication state. Token management is delegated to
 * AuthFetchTransport from @extrachill/api-client, with expo-secure-store
 * wired in via src/api/client.ts.
 *
 * OAuth config is fetched on init. Google Sign-In is lazily loaded when
 * triggered (requires native module, won't work in Expo Go).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { AuthMeResponse, OAuthConfigResponse } from '../types/api';
import { api, transport } from '../api/client';
import { getDeviceId } from './storage';

let googleSignInModule: typeof import('@react-native-google-signin/google-signin') | null = null;
let oauthConfigCache: OAuthConfigResponse | null = null;

interface AuthState {
    user: AuthMeResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    sessionExpired: boolean;
    onboardingCompleted: boolean;
    googleEnabled: boolean;
}

interface AuthContextValue extends AuthState {
    login: (identifier: string, password: string) => Promise<void>;
    register: (email: string, password: string, passwordConfirm: string) => Promise<{ onboardingCompleted: boolean }>;
    loginWithGoogle: () => Promise<{ onboardingCompleted: boolean }>;
    completeOnboarding: (username: string, userIsArtist: boolean, userIsProfessional: boolean) => Promise<void>;
    logout: () => Promise<void>;
    clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Parse an access_expires_at ISO string into a Unix timestamp (seconds).
 */
function parseExpiresAt(expiresAt: string): number {
    return Math.floor(new Date(expiresAt).getTime() / 1000);
}

/**
 * Lazily load and configure Google Sign-In.
 * Returns the module if available, null if native module not found.
 */
async function getGoogleSignIn(config: OAuthConfigResponse): Promise<typeof import('@react-native-google-signin/google-signin') | null> {
    if (googleSignInModule) return googleSignInModule;

    try {
        googleSignInModule = await import('@react-native-google-signin/google-signin');

        const iosClientId = config.google.ios_client_id;
        const webClientId = config.google.web_client_id;

        googleSignInModule.GoogleSignin.configure({
            iosClientId: Platform.OS === 'ios' ? iosClientId : undefined,
            webClientId,
            offlineAccess: false,
        });

        return googleSignInModule;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        sessionExpired: false,
        onboardingCompleted: true,
        googleEnabled: false,
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

        // Fetch OAuth config (lazy-load Google Sign-In when actually used)
        let googleEnabled = false;
        try {
            oauthConfigCache = await api.auth.getOAuthConfig();
            googleEnabled = oauthConfigCache.google.enabled;
        } catch {
            // OAuth config fetch failed, Google Sign-In disabled
        }

        if (!transport.hasTokens()) {
            setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                sessionExpired: false,
                onboardingCompleted: true,
                googleEnabled,
            });
            return;
        }

        try {
            const user = await api.auth.me();
            const onboardingStatus = await api.users.getOnboardingStatus();
            setState({
                user,
                isLoading: false,
                isAuthenticated: true,
                sessionExpired: false,
                onboardingCompleted: onboardingStatus.completed,
                googleEnabled,
            });
        } catch {
            setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
                sessionExpired: false,
                onboardingCompleted: true,
                googleEnabled,
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
            api.users.getOnboardingStatus(),
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

    const loginWithGoogle = useCallback(async () => {
        if (!oauthConfigCache) {
            throw new Error('Google Sign-In not available');
        }

        const gsi = await getGoogleSignIn(oauthConfigCache);
        if (!gsi) {
            throw new Error('Google Sign-In requires a development build');
        }

        try {
            await gsi.GoogleSignin.hasPlayServices();
            const response = await gsi.GoogleSignin.signIn();

            if (!gsi.isSuccessResponse(response)) {
                throw new Error('Google Sign-In was cancelled');
            }

            const idToken = response.data.idToken;
            if (!idToken) {
                throw new Error('No ID token received from Google');
            }

            const deviceId = await getDeviceId();
            const authResponse = await api.auth.loginWithGoogle({
                id_token: idToken,
                device_id: deviceId,
                registration_source: 'extrachill-app',
                registration_method: 'google',
            });

            await transport.setTokens({
                accessToken: authResponse.access_token,
                refreshToken: authResponse.refresh_token,
                accessExpiresAt: parseExpiresAt(authResponse.access_expires_at),
            });

            const [me, onboardingStatus] = await Promise.all([
                api.auth.me(),
                api.users.getOnboardingStatus(),
            ]);

            setState(prev => ({
                ...prev,
                user: me,
                isLoading: false,
                isAuthenticated: true,
                sessionExpired: false,
                onboardingCompleted: onboardingStatus.completed,
            }));

            return { onboardingCompleted: onboardingStatus.completed };
        } catch (error) {
            if (gsi.isErrorWithCode(error)) {
                switch (error.code) {
                    case gsi.statusCodes.SIGN_IN_CANCELLED:
                        throw new Error('Sign-in cancelled');
                    case gsi.statusCodes.IN_PROGRESS:
                        throw new Error('Sign-in already in progress');
                    case gsi.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        throw new Error('Google Play Services not available');
                    default:
                        throw new Error('Google Sign-In failed');
                }
            }
            throw error;
        }
    }, []);

    const completeOnboarding = useCallback(async (
        username: string,
        userIsArtist: boolean,
        userIsProfessional: boolean
    ) => {
        const response = await api.users.submitOnboarding({
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
        if (googleSignInModule) {
            try {
                const currentUser = await googleSignInModule.GoogleSignin.getCurrentUser();
                if (currentUser) {
                    await googleSignInModule.GoogleSignin.signOut();
                }
            } catch {
                // Ignore Google sign-out errors
            }
        }

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

    return (
        <AuthContext.Provider value={{ ...state, login, register, loginWithGoogle, completeOnboarding, logout, clearSessionExpired }}>
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
