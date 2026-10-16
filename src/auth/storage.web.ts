/**
 * Web storage helpers for auth tokens and device ID.
 * Mirrors the native storage API using browser localStorage.
 */

import * as Crypto from 'expo-crypto';
import type { TokenStorageAdapter } from 'wp-native-shell';

const KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    ACCESS_EXPIRY: 'access_expiry',
    DEVICE_ID: 'device_id',
} as const;

export async function getDeviceId(): Promise<string> {
    let deviceId = localStorage.getItem(KEYS.DEVICE_ID);

    if (!deviceId) {
        deviceId = Crypto.randomUUID();
        localStorage.setItem(KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
}

export async function storeTokens(
    accessToken: string,
    refreshToken: string,
    accessExpiresAt: number
): Promise<void> {
    localStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(KEYS.ACCESS_EXPIRY, accessExpiresAt.toString());
}

export interface StoredTokens {
    accessToken: string | null;
    refreshToken: string | null;
    accessExpiresAt: number | null;
}

export async function getTokens(): Promise<StoredTokens> {
    const accessToken = localStorage.getItem(KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(KEYS.REFRESH_TOKEN);
    const accessExpiryStr = localStorage.getItem(KEYS.ACCESS_EXPIRY);
    const accessExpiresAt = accessExpiryStr ? parseInt(accessExpiryStr, 10) : null;

    return { accessToken, refreshToken, accessExpiresAt };
}

export async function clearTokens(): Promise<void> {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.ACCESS_EXPIRY);
}

/** wp-native-shell TokenStorageAdapter backed by browser localStorage. */
export const secureStoreAdapter: TokenStorageAdapter = {
    getItem: async (key: string) => localStorage.getItem(key),
    setItem: async (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: async (key: string) => localStorage.removeItem(key),
};
