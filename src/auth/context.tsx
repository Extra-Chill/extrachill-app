/**
 * Auth context provider and useAuth hook
 * 
 * Manages user authentication state. Token management is delegated to the API client.
 * OAuth config is fetched on init. Google Sign-In is lazily loaded when triggered
 * (requires native module, won't work in Expo Go).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { AuthMeResponse, OAuthConfigResponse } from '../types/api';
import { api } from '../api/client';

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
        await api.initialize(handleAuthFailure);

        // Fetch OAuth config (lazy-load Google Sign-In when actually used)
        let googleEnabled = false;
        try {
            oauthConfigCache = await api.getOAuthConfig();
            googleEnabled = oauthConfigCache.google.enabled;
        } catch {
            // OAuth config fetch failed, Google Sign-In disabled
        }

        if (!api.hasTokens()) {
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
            const user = await api.getMe();
            const onboardingStatus = await api.getOnboardingStatus();
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
        await api.login(identifier, password);

        const [me, onboardingStatus] = await Promise.all([
            api.getMe(),
            api.getOnboardingStatus(),
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
        const response = await api.register(email, password, passwordConfirm);
        const me = await api.getMe();

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

            await api.loginWithGoogle(idToken);

            const [me, onboardingStatus] = await Promise.all([
                api.getMe(),
                api.getOnboardingStatus(),
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
        const response = await api.submitOnboarding(username, userIsArtist, userIsProfessional);

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

        await api.logout();
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
