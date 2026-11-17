/**
 * Hand Google/Apple sign-in tokens to wp-native-shell.
 *
 * The provider routes (extrachill/v1/auth/google|apple) return wp-native-auth
 * tokens. They must land in the shell's transport (memory + its storage keys)
 * and flip the shell's auth state, exactly like a password or continued login.
 *
 * wp-native-shell with `completeLogin()` does that in one call. Older shells
 * (0.2.x, what the app installs today) don't have it, so we fall back to the
 * same steps the shell runs: transport.setTokens → discover → load the user.
 *
 * This module has no runtime imports so node:test can load it directly.
 */

import type { GoogleLoginResponse } from '../types/oauth';

/** Tokens in the shape AuthFetchTransport stores. */
interface ShellStoredTokens {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: number;
}

interface ShellTransportLike {
    setTokens?: (tokens: ShellStoredTokens) => Promise<void>;
}

/**
 * The parts of `useAuth()` this module uses. `completeLogin` and
 * `getDeviceId` are optional so the code works with shells that predate them.
 */
export interface ShellAuthLike {
    client: unknown;
    refreshSession: () => Promise<void>;
    completeLogin?: (result: {
        access_token: string;
        access_expires_at: string;
        refresh_token: string;
        refresh_expires_at: string;
        user: Record<string, unknown>;
    }) => Promise<void>;
    getDeviceId?: () => Promise<string>;
}

/** Subset of the provider login response that carries the session. */
export type SocialLoginTokens = Pick<
    GoogleLoginResponse,
    'access_token' | 'access_expires_at' | 'refresh_token' | 'refresh_expires_at' | 'user'
>;

function parseExpiresAt(expiresAt: string): number {
    return Math.floor(new Date(expiresAt).getTime() / 1000);
}

function assertTokens(response: SocialLoginTokens): void {
    if (
        !response
        || typeof response.access_token !== 'string' || response.access_token === ''
        || typeof response.refresh_token !== 'string' || response.refresh_token === ''
        || typeof response.access_expires_at !== 'string'
        || Number.isNaN(parseExpiresAt(response.access_expires_at))
    ) {
        throw new Error('Sign-in failed: the server did not return a session.');
    }
}

/**
 * Device id for provider sign-in. Refresh tokens are bound to the device id,
 * and the shell refreshes with its own id, so provider logins must send it.
 */
export function shellDeviceId(auth: Pick<ShellAuthLike, 'getDeviceId'>, fallback: () => Promise<string>): Promise<string> {
    return typeof auth.getDeviceId === 'function' ? auth.getDeviceId() : fallback();
}

/**
 * Install a provider sign-in session in the shell and refresh auth state.
 * Resolves once the shell reports the member as signed in.
 */
export async function installSocialSession(auth: ShellAuthLike, response: SocialLoginTokens): Promise<void> {
    assertTokens(response);

    if (typeof auth.completeLogin === 'function') {
        await auth.completeLogin({
            access_token: response.access_token,
            access_expires_at: response.access_expires_at,
            refresh_token: response.refresh_token,
            refresh_expires_at: response.refresh_expires_at,
            user: { ...response.user },
        });
    } else {
        // Shells before completeLogin(): same steps through the shell's own
        // transport. Its `transport` is TypeScript-private, not runtime-private.
        const client = auth.client as { transport?: ShellTransportLike; discover?: () => Promise<unknown> } | null;
        const transport = client?.transport;
        if (!transport || typeof transport.setTokens !== 'function') {
            throw new Error('Sign-in failed: this app version cannot store the session.');
        }
        await transport.setTokens({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            accessExpiresAt: parseExpiresAt(response.access_expires_at),
        });
        if (typeof client?.discover === 'function') await client.discover();

        // Older shells: refreshSession() loads /me and flips to signed in.
        await auth.refreshSession();
        return;
    }

    // completeLogin() already signed in with the provider's partial user;
    // load the full /me user. A failure here doesn't undo the sign-in.
    try {
        await auth.refreshSession();
    } catch {
        // Keep the session; the next refresh fills in the user.
    }
}
