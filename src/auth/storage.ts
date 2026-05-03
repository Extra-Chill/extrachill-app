/**
 * Secure storage helpers for auth tokens and device ID.
 *
 * Provides two things:
 * 1. Legacy helpers (getDeviceId, storeTokens, etc.) used by EC's
 *    internal auth code (src/auth/context.tsx, src/auth/oauth.ts).
 * 2. `secureStoreAdapter` — a TokenStorageAdapter for wp-native-shell.
 *    Shell 0.1.0 uses a simple key-value interface (getItem/setItem/
 *    removeItem); the transport layer handles serialisation internally.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { TokenStorageAdapter } from 'wp-native-shell';

const KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    ACCESS_EXPIRY: 'access_expiry',
    DEVICE_ID: 'device_id',
} as const;

export async function getDeviceId(): Promise<string> {
    let deviceId = await SecureStore.getItemAsync(KEYS.DEVICE_ID);

    if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync(KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
}

export async function storeTokens(
    accessToken: string,
    refreshToken: string,
    accessExpiresAt: number
): Promise<void> {
    await Promise.all([
        SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
        SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
        SecureStore.setItemAsync(KEYS.ACCESS_EXPIRY, accessExpiresAt.toString()),
    ]);
}

export interface StoredTokens {
    accessToken: string | null;
    refreshToken: string | null;
    accessExpiresAt: number | null;
}

export async function getTokens(): Promise<StoredTokens> {
    const [accessToken, refreshToken, accessExpiryStr] = await Promise.all([
        SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
        SecureStore.getItemAsync(KEYS.ACCESS_EXPIRY),
    ]);

    const accessExpiresAt = accessExpiryStr ? parseInt(accessExpiryStr, 10) : null;

    return { accessToken, refreshToken, accessExpiresAt };
}

export async function clearTokens(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
        SecureStore.deleteItemAsync(KEYS.ACCESS_EXPIRY),
    ]);
}

/**
 * wp-native-shell 0.1.0 TokenStorageAdapter.
 *
 * Simple key-value interface backed by expo-secure-store.
 * The shell's AuthFetchTransport manages its own key scheme
 * (e.g. "wp-native:access_token") and calls getItem/setItem/removeItem.
 */
export const secureStoreAdapter: TokenStorageAdapter = {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
