/** Provider OAuth hooks sharing configuration and EC token storage. */

import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { buildAppleLoginRequest, hashAppleNonce, withAppleCancellation } from './apple';
import type { OAuthConfigResponse, OnboardingStatusResponse, ECStoredTokens } from '../types/oauth';
import { ECRestClient } from './ec-rest-client';
import { useAuth } from 'wp-native-shell';
import { storeTokens, getTokens, clearTokens, getDeviceId } from './storage';

// EC-specific OAuth routes that aren't wp-native abilities.

const ecClient = new ECRestClient({
    baseUrl: 'https://extrachill.com/wp-json',
    getDeviceId,
    defaultHeaders: { 'ExtraChill-Client': 'app' },

    loadTokens: async (): Promise<ECStoredTokens | null> => {
        const tokens = await getTokens();
        if (!tokens.accessToken || !tokens.refreshToken || tokens.accessExpiresAt === null) {
            return null;
        }
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            accessExpiresAt: tokens.accessExpiresAt,
        };
    },

    saveTokens: async (tokens: ECStoredTokens): Promise<void> => {
        await storeTokens(tokens.accessToken, tokens.refreshToken, tokens.accessExpiresAt);
    },

    clearTokens,
});

// ─── Module-level singletons ────────────────────────────────────────────────

let googleSignInModule: typeof import('@react-native-google-signin/google-signin') | null = null;
let oauthConfigCache: OAuthConfigResponse | null = null;
let oauthConfigRequest: Promise<OAuthConfigResponse> | null = null;

/** Both provider hooks share one in-flight request and its successful result. */
function useOAuthConfig(): OAuthConfigResponse | null {
    const [config, setConfig] = useState(oauthConfigCache);
    useEffect(() => {
        let cancelled = false;
        if (!oauthConfigRequest) {
            oauthConfigRequest = ecClient.getOAuthConfig().then(result => {
                oauthConfigCache = result;
                return result;
            }).catch(error => {
                oauthConfigRequest = null;
                throw error;
            });
        }
        oauthConfigRequest.then(result => {
            if (!cancelled) setConfig(result);
        }).catch(() => { /* Config failures silently disable provider buttons. */ });
        return () => { cancelled = true; };
    }, []);
    return config;
}

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
    const config = useOAuthConfig();
    const googleEnabled = config?.google.enabled ?? false;
    const { client } = useAuth();

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
            const authResponse = await ecClient.loginWithGoogle({
                id_token: idToken,
                device_id: deviceId,
                registration_source: 'extrachill-app',
                registration_method: 'google',
            });

            await ecClient.setTokens({
                accessToken: authResponse.access_token,
                refreshToken: authResponse.refresh_token,
                accessExpiresAt: parseExpiresAt(authResponse.access_expires_at),
            });

            const onboardingStatus = await client.execute<OnboardingStatusResponse>(
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
    }, [client]);

    return { googleEnabled, loginWithGoogle };
}

export function useAppleAuth() {
    const config = useOAuthConfig();
    const [available, setAvailable] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (Platform.OS === 'ios') {
            AppleAuthentication.isAvailableAsync().then(value => {
                if (!cancelled) setAvailable(value);
            }).catch(() => { /* Unsupported devices leave Apple disabled. */ });
        }
        return () => { cancelled = true; };
    }, []);

    const appleEnabled = Platform.OS === 'ios' && !!config?.apple.enabled && available;
    const loginWithApple = useCallback(async () => {
        if (!appleEnabled) throw new Error('Apple Sign-In not available');

        return withAppleCancellation(async () => {
            const rawNonce = Crypto.randomUUID();
            const nonce = await hashAppleNonce(rawNonce, value => Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                value,
                { encoding: Crypto.CryptoEncoding.HEX },
            ));
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce,
            });
            const response = await ecClient.loginWithApple(buildAppleLoginRequest(
                credential, rawNonce, await getDeviceId(),
            ));
            await ecClient.setTokens({
                accessToken: response.access_token,
                refreshToken: response.refresh_token,
                accessExpiresAt: parseExpiresAt(response.access_expires_at),
            });
            return { onboardingCompleted: response.onboarding_completed };
        });
    }, [appleEnabled]);

    return { appleEnabled, loginWithApple };
}
