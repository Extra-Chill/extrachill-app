import type { AppleLoginRequest } from '../types/oauth';

/** Keep the raw nonce for the server; only its SHA-256 hex digest goes to Apple. */
export async function hashAppleNonce(
    rawNonce: string,
    sha256: (value: string) => Promise<string>,
): Promise<string> {
    return sha256(rawNonce);
}

export function buildAppleLoginRequest(
    credential: {
        identityToken: string | null;
        fullName?: { givenName?: string | null; familyName?: string | null } | null;
    },
    rawNonce: string,
    deviceId: string,
): AppleLoginRequest {
    if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
    }
    return {
        identity_token: credential.identityToken,
        nonce: rawNonce,
        device_id: deviceId,
        ...(credential.fullName?.givenName ? { given_name: credential.fullName.givenName } : {}),
        ...(credential.fullName?.familyName ? { family_name: credential.fullName.familyName } : {}),
        registration_source: 'extrachill-app',
        registration_method: 'apple',
    };
}

export function isAppleCancellation(error: unknown): boolean {
    return typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'ERR_REQUEST_CANCELED';
}

/** Cancellation returns no result, so callers neither refresh nor navigate. */
export async function withAppleCancellation<T>(action: () => Promise<T>): Promise<T | null> {
    try {
        return await action();
    } catch (error) {
        if (isAppleCancellation(error)) return null;
        throw error;
    }
}
