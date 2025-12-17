/**
 * Secure storage helpers for auth tokens and device ID
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
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

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
        SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
        SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
}

export async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
    ]);

    return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
    await Promise.all([
        SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    ]);
}
