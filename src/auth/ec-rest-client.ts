/**
 * Lightweight EC REST client for Google OAuth routes.
 *
 * Replaces @extrachill/api-client usage in oauth.ts (M8 retirement, #37).
 * Only covers the two endpoints the app still needs:
 *   - GET  extrachill/v1/auth/oauth-config
 *   - POST extrachill/v1/auth/google
 *
 * Token lifecycle (Bearer injection, refresh, persist) is handled inline.
 * Once these routes migrate to wp-native-shell abilities, this file
 * can be deleted entirely.
 */

import type {
    OAuthConfigResponse,
    GoogleLoginResponse,
    ECStoredTokens,
} from '../types/oauth';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface ECRestClientConfig {
    /** Base URL for the REST API, e.g. "https://extrachill.com/wp-json" */
    baseUrl: string;

    /** Return a stable device ID (UUID persisted in SecureStore). */
    getDeviceId: () => string | Promise<string>;

    /**
     * Load persisted tokens. Return null when no tokens are stored.
     */
    loadTokens: () => ECStoredTokens | null | Promise<ECStoredTokens | null>;

    /**
     * Persist tokens after a successful login or token refresh.
     */
    saveTokens: (tokens: ECStoredTokens) => void | Promise<void>;

    /**
     * Clear persisted tokens on logout or auth failure.
     */
    clearTokens: () => void | Promise<void>;

    /**
     * Extra headers to include on every request.
     */
    defaultHeaders?: Record<string, string>;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export class ECRestClient {
    private readonly config: ECRestClientConfig;
    private tokens: ECStoredTokens | null = null;

    constructor(config: ECRestClientConfig) {
        this.config = config;
    }

    // ── Token management ────────────────────────────────────────────────

    /**
     * Store new tokens in memory and persist via saveTokens callback.
     * Call after login or Google auth.
     */
    async setTokens(tokens: ECStoredTokens): Promise<void> {
        this.tokens = tokens;
        await this.config.saveTokens(tokens);
    }

    // ── Auth endpoints ──────────────────────────────────────────────────

    /** GET extrachill/v1/auth/oauth-config */
    async getOAuthConfig(): Promise<OAuthConfigResponse> {
        return this.get<OAuthConfigResponse>('extrachill/v1/auth/oauth-config');
    }

    /** POST extrachill/v1/auth/google */
    async loginWithGoogle(data: {
        id_token: string;
        device_id: string;
        registration_source?: string;
        registration_method?: string;
    }): Promise<GoogleLoginResponse> {
        return this.post<GoogleLoginResponse>('extrachill/v1/auth/google', data);
    }

    // ── HTTP helpers ────────────────────────────────────────────────────

    private async get<T>(path: string): Promise<T> {
        const url = `${this.config.baseUrl}/${path}`;
        const headers: Record<string, string> = {
            Accept: 'application/json',
            ...this.config.defaultHeaders,
        };

        if (this.tokens) {
            headers['Authorization'] = `Bearer ${this.tokens.accessToken}`;
        }

        const res = await fetch(url, { method: 'GET', headers });

        if (!res.ok) {
            throw new Error(`EC REST GET ${path} failed: ${res.status}`);
        }

        return res.json() as Promise<T>;
    }

    private async post<T>(
        path: string,
        body: Record<string, unknown>,
    ): Promise<T> {
        const url = `${this.config.baseUrl}/${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.config.defaultHeaders,
        };

        if (this.tokens) {
            headers['Authorization'] = `Bearer ${this.tokens.accessToken}`;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`EC REST POST ${path} failed: ${res.status}`);
        }

        return res.json() as Promise<T>;
    }
}
