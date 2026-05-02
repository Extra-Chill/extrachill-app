/**
 * Google OAuth hook — extracted from context.tsx (M7.2.3).
 *
 * Handles Google Sign-In lazy loading, OAuth config fetching, and the
 * loginWithGoogle action. The REST route for Google login still uses
 * @extrachill/api-client — that retires in M8.
 *
 * Consumers call useGoogleAuth() alongside useAuth() from context.tsx.
 */

import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { OAuthConfigResponse, OnboardingStatusResponse } from '../types/api';
import { api, transport } from '../api/client';
import { queryAbility } from '../api/abilities';
import { getDeviceId } from './storage';

// ─── Module-level singletons ────────────────────────────────────────────────

let googleSignInModule: typeof import('@react-native-google-signin/google-signin') | null = null;
let oauthConfigCache: OAuthConfigResponse | null = null;

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
async function getGoogleSignIn(
    config: OAuthConfigResponse,
): Promise<typeof import('@react-native-google-signin/google-signin') | null> {
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

/**
 * Sign out of Google if the module was loaded. Safe to call even if the user
 * never signed in with Google. Called by AuthProvider's logout() action.
 */
export async function signOutGoogle(): Promise<void> {
    if (!googleSignInModule) return;

    try {
        const currentUser = await googleSignInModule.GoogleSignin.getCurrentUser();
        if (currentUser) {
            await googleSignInModule.GoogleSignin.signOut();
        }
    } catch {
        // Ignore Google sign-out errors
    }
}

// ─── Public types ────────────────────────────────────────────────────────────

export interface GoogleAuthState {
    googleEnabled: boolean;
}

export interface GoogleAuthActions {
    loginWithGoogle: () => Promise<{ onboardingCompleted: boolean }>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Provides Google OAuth state and actions.
 *
 * Fetches OAuth config on mount and exposes loginWithGoogle().
 * The config fetch is fire-and-forget — failures silently disable Google.
 *
 * After loginWithGoogle() resolves, tokens are stored via the transport.
 * The caller must trigger an auth state refresh (e.g. via useAuth().refreshUser())
 * to update the AuthProvider's state.
 */
export function useGoogleAuth(): GoogleAuthState & GoogleAuthActions {
    const [googleEnabled, setGoogleEnabled] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchOAuthConfig() {
            try {
                oauthConfigCache = await api.auth.getOAuthConfig();
                if (!cancelled) {
                    setGoogleEnabled(oauthConfigCache.google.enabled);
                }
            } catch {
                // OAuth config fetch failed, Google Sign-In stays disabled
            }
        }

        fetchOAuthConfig();
        return () => { cancelled = true; };
    }, []);

    const loginWithGoogle = useCallback(async (): Promise<{ onboardingCompleted: boolean }> => {
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

            const onboardingStatus = await queryAbility<OnboardingStatusResponse>(
                'extrachill/get-onboarding-status',
            );

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

    return { googleEnabled, loginWithGoogle };
}
