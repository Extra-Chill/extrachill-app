/**
 * Two-step sign-in transport and Security settings client.
 *
 * Sign-in: one entry point, continueTwoFactorSignIn(), sits in front of a
 * swappable TwoFactorSignInTransport so the continue route (wp-native ability
 * or extrachill/v1/auth/login/continue) can change without touching UI.
 *
 * Settings: thin wrappers over the Two Factor REST namespace
 * (`/two-factor/1.0/...`, WordPress/two-factor#935 and #1045), called through
 * the shell's bearer-authenticated transport.
 *
 * This module has no runtime imports so node:test can load it directly.
 */

import type { WPNativeClient } from 'wp-native-client';
import type { AuthChallengeRequirement } from 'wp-native-shell';

// ─── Errors ──────────────────────────────────────────────────────────────────

/** HTTP failure that keeps WordPress's `code` and `data` (retry_after, revalidation). */
export class TwoFactorRequestError extends Error {
    readonly status: number;
    readonly code: string;
    readonly data: Record<string, unknown>;

    constructor(message: string, status: number, code: string, data: Record<string, unknown> = {}) {
        super(message);
        this.name = 'TwoFactorRequestError';
        this.status = status;
        this.code = code;
        this.data = data;
    }
}

function fields(error: unknown): { status: number; code: string; data: Record<string, unknown> } {
    const value = (error && typeof error === 'object' ? error : {}) as { status?: unknown; code?: unknown; data?: unknown };
    const data = value.data && typeof value.data === 'object' ? value.data as Record<string, unknown> : {};
    return {
        status: Number(value.status ?? data.status ?? 0) || 0,
        code: typeof value.code === 'string' ? value.code : '',
        data,
    };
}

/** True when a Two Factor write was refused until the member confirms it's them. */
export function isRevalidationRequired(error: unknown): boolean {
    const { code, data } = fields(error);
    const revalidation = data.revalidation as { required?: unknown } | undefined;
    return code === 'revalidation_required' || revalidation?.required === true;
}

/** The Two Factor REST routes are not installed (upstream not shipped yet). */
export function isRouteMissing(error: unknown): boolean {
    const { status, code } = fields(error);
    return code === 'rest_no_route' || status === 404;
}

// ─── Sign-in continuation ───────────────────────────────────────────────────

export interface TwoFactorCodeResponse { provider: string; code: string }
export interface TwoFactorResendResponse { provider: string; resend: true }
export type TwoFactorChallengeResponse = TwoFactorCodeResponse | TwoFactorResendResponse;

export type ContinueResult =
    | { status: 'signed_in' }
    | { status: 'code_sent' }
    | { status: 'challenge'; challenge: AuthChallengeRequirement };

export interface TwoFactorSignInTransport {
    /** Verify a code; success means the session is installed. */
    verify: (continuationToken: string, response: TwoFactorCodeResponse) => Promise<ContinueResult>;
    /** Ask the server to send a fresh code (email) without consuming the continuation. */
    resend: (continuationToken: string, provider: string) => Promise<ContinueResult>;
}

function isChallenge(value: unknown): value is AuthChallengeRequirement {
    return Boolean(value && typeof value === 'object' && (value as { challenge_required?: unknown }).challenge_required === true);
}

/** Normalize a continue response that did not install a session. */
export function normalizeContinueResult(raw: unknown): ContinueResult {
    if (isChallenge(raw)) return { status: 'challenge', challenge: raw };
    return { status: 'code_sent' };
}

/** The single sign-in continuation entry point used by the UI. */
export function continueTwoFactorSignIn(
    transport: TwoFactorSignInTransport,
    continuationToken: string,
    response: TwoFactorChallengeResponse,
): Promise<ContinueResult> {
    if ('resend' in response && response.resend) {
        return transport.resend(continuationToken, response.provider);
    }
    return transport.verify(continuationToken, response as TwoFactorCodeResponse);
}

/** Where a raw continue request is sent. Both mirror wp-native/auth-continue-login. */
export const CONTINUE_ROUTES = {
    ability: 'wp-abilities/v1/abilities/wp-native/auth-continue-login/run',
    rest: 'extrachill/v1/auth/login/continue',
} as const;
export type ContinueRoute = keyof typeof CONTINUE_ROUTES;

export interface ContinueRequestConfig {
    /** REST root, e.g. "https://extrachill.com/wp-json/". */
    baseUrl: string;
    /** wp-native client id; continuations are bound to it. */
    clientId: string;
    /** Must be the same device id the login request used. */
    getDeviceId: () => Promise<string>;
    route?: ContinueRoute;
    fetchImpl?: typeof fetch;
}

/**
 * Raw continue request that returns the full JSON body and throws
 * TwoFactorRequestError with WordPress's error data. Used for resend, which
 * never installs a session.
 */
export function createContinueRequest(config: ContinueRequestConfig) {
    const route = config.route ?? 'ability';
    const url = `${config.baseUrl.replace(/\/+$/, '')}/${CONTINUE_ROUTES[route]}`;
    return async (continuationToken: string, challengeResponse: TwoFactorChallengeResponse): Promise<unknown> => {
        const payload = {
            continuation_token: continuationToken,
            device_id: await config.getDeviceId(),
            challenge_response: challengeResponse,
        };
        const res = await (config.fetchImpl ?? fetch)(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'WP-Native-Client': config.clientId },
            body: JSON.stringify(route === 'ability' ? { input: payload } : payload),
        });
        const body = await res.json().catch(() => null) as { code?: string; message?: string; data?: Record<string, unknown> } | null;
        if (!res.ok) {
            throw new TwoFactorRequestError(body?.message || `Request failed with status ${res.status}`, res.status, body?.code || 'request_failed', body?.data ?? {});
        }
        return body;
    };
}

/**
 * Default transport: verification goes through the shell's continueLogin so
 * the shell stores tokens and flips to signed-in; resend uses a raw request
 * so a re-issued challenge never reaches the shell's token path.
 */
export function createShellSignInTransport(options: {
    continueLogin: (continuationToken: string, challengeResponse: Record<string, unknown>) => Promise<unknown>;
    continueRequest: (continuationToken: string, response: TwoFactorChallengeResponse) => Promise<unknown>;
}): TwoFactorSignInTransport {
    return {
        async verify(continuationToken, response) {
            const result = await options.continueLogin(continuationToken, { provider: response.provider, code: response.code });
            return isChallenge(result) ? { status: 'challenge', challenge: result } : { status: 'signed_in' };
        },
        async resend(continuationToken, provider) {
            return normalizeContinueResult(await options.continueRequest(continuationToken, { provider, resend: true }));
        },
    };
}

// ─── Settings → Security REST ────────────────────────────────────────────────

export interface RestRequest { path: string; method: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown> }
export type RestRequester = <T>(request: RestRequest) => Promise<T>;

/**
 * Bearer-authenticated requests through the shell's transport (token refresh
 * and 401 retry included). wp-native-client has no public raw-REST method yet,
 * so this reaches the client's transport; it fails loudly if that changes.
 */
export function shellRestRequester(client: WPNativeClient): RestRequester {
    const transport = (client as unknown as { transport?: { request?: <T>(req: RestRequest) => Promise<T> } }).transport;
    if (!transport || typeof transport.request !== 'function') {
        return () => Promise.reject(new TwoFactorRequestError('Two-step sign-in settings are unavailable.', 404, 'rest_no_route'));
    }
    return <T>(request: RestRequest) => transport.request!<T>(request);
}

const NS = 'two-factor/1.0';

export interface ProviderSettingsResponse {
    user_id: number;
    providers: { key: string; label: string; supported: boolean; configured: boolean; enabled: boolean; primary: boolean; remaining: number | null }[];
    revalidation?: { required: boolean; action?: string; url?: string; rest_route?: string };
}
export interface EnrollmentResponse { secret: string; otpauth_uri: string; expires_at: number | string }
export interface BackupCodesResponse { codes: string[]; download_link?: string }
export interface RevalidateResponse {
    result: 'challenge' | 'code_sent' | 'revalidated';
    provider?: string;
    providers?: { key: string; label: string }[];
}

export const getProviderSettings = (request: RestRequester, userId: number) =>
    request<ProviderSettingsResponse>({ path: `${NS}/users/${userId}/providers`, method: 'GET' });

export const updateProviderSettings = (request: RestRequester, userId: number, payload: { enabled_providers: string[]; primary_provider: string }) =>
    request<ProviderSettingsResponse>({ path: `${NS}/users/${userId}/providers`, method: 'POST', body: { ...payload } });

export const beginAuthenticatorSetup = (request: RestRequester, userId: number) =>
    request<EnrollmentResponse>({ path: `${NS}/totp/enrollment`, method: 'POST', body: { user_id: userId } });

export const confirmAuthenticatorSetup = (request: RestRequester, userId: number, code: string) =>
    request<unknown>({ path: `${NS}/totp`, method: 'POST', body: { user_id: userId, code, enable_provider: true } });

export const generateBackupCodes = (request: RestRequester, userId: number) =>
    request<BackupCodesResponse>({ path: `${NS}/generate-backup-codes`, method: 'POST', body: { user_id: userId, enable_provider: true } });

export const startRevalidation = (request: RestRequester, provider?: string) =>
    request<RevalidateResponse>({ path: `${NS}/revalidate`, method: 'POST', body: provider ? { provider } : {} });

export const sendRevalidationCode = (request: RestRequester, provider: string) =>
    request<RevalidateResponse>({ path: `${NS}/revalidate`, method: 'POST', body: { provider, resend: true } });

export const submitRevalidation = (request: RestRequester, provider: string, code: string) =>
    request<RevalidateResponse>({ path: `${NS}/revalidate`, method: 'POST', body: { provider, code } });

/**
 * Run a sensitive action; if the server says "confirm it's you first", ask
 * (the UI shows the sheet), then retry the original action exactly once.
 * Resolves undefined when the member dismisses the sheet.
 */
export async function runWithRevalidation<T>(action: () => Promise<T>, confirm: () => Promise<boolean>): Promise<T | undefined> {
    try {
        return await action();
    } catch (error) {
        if (!isRevalidationRequired(error)) throw error;
        if (!(await confirm())) return undefined;
        return action();
    }
}
