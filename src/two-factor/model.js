// Pure two-step sign-in logic: challenge parsing, the sign-in code reducer,
// error classification, and Security settings transitions. No React Native.

export const TWO_FACTOR_CHALLENGE = 'two_factor';
/**
 * Countdown used only when a 429 arrives without `data.retry_after`: the
 * installed wp-native-client (< the release with ApiError.data) drops WordPress
 * error data on the shell's verify path. Clients that keep `data` count down
 * from the server's retry_after instead.
 */
export const DEFAULT_RETRY_SECONDS = 30;
export const MAX_CODE_LENGTH = 12;

const METHOD_COPY = {
    app: {
        title: 'Authenticator app',
        prompt: 'Enter the 6-digit code from your authenticator app.',
    },
    email: {
        title: 'Email code',
        prompt: 'Enter the code we emailed you.',
    },
    backup: {
        title: 'Backup code',
        prompt: 'Enter one of your saved backup codes. Each one works once.',
    },
};

export const SIGN_IN_COPY = {
    invalid: "That code didn't work. Check it and try again.",
    rateLimited: 'Too many tries. Wait a moment, then try again.',
    busy: 'Still checking your last code. Try again in a moment.',
    failed: "We couldn't check your code. Check your connection and try again.",
    codeSent: 'We sent a new code to your email.',
    expired: 'Your sign-in timed out. Sign in again to get a new code.',
    resetRequired: "For your security, you need to choose a new password before you can sign in. Check your email for a link to set a new one, then sign in again.",
    unsupported: "This account needs an extra sign-in step the app can't do yet.",
};

/** Map an upstream provider key to the kind of method a member recognizes. */
export function providerKind(key) {
    const value = String(key ?? '').toLowerCase();
    if (value.includes('totp')) return 'app';
    if (value.includes('backup') || value.includes('recovery')) return 'backup';
    if (value.includes('email')) return 'email';
    return 'other';
}

/** Member-facing title and prompt for a method; unknown methods use the server label. */
export function methodCopy(provider) {
    const copy = METHOD_COPY[provider?.kind ?? providerKind(provider?.key)];
    if (copy) return copy;
    const label = typeof provider?.label === 'string' && provider.label ? provider.label : 'Sign-in code';
    return { title: label, prompt: 'Enter your sign-in code.' };
}

/** Codes are numeric for every shipped method; strip spaces/dashes from pastes. */
export function sanitizeCode(value) {
    return String(value ?? '').replace(/\D/g, '').slice(0, MAX_CODE_LENGTH);
}

export function codeReady(kind, code) {
    return kind === 'app' ? code.length === 6 : code.length >= 6;
}

function normalizeProvider(item) {
    if (!item || typeof item.key !== 'string' || !item.key) return null;
    const kind = providerKind(item.key);
    const label = typeof item.label === 'string' && item.label ? item.label : item.key;
    return { key: item.key, label, kind };
}

/** True for any wp-native-auth challenge requirement, of any type. */
export function isChallengeRequired(result) {
    return Boolean(result && typeof result === 'object' && result.challenge_required === true);
}

/**
 * Normalize a `challenge_required` login result whose challenge type is
 * two-step sign-in. Returns null for success payloads, other challenge types,
 * or malformed challenges.
 */
export function parseTwoFactorChallenge(result) {
    if (!isChallengeRequired(result)) return null;
    const challenge = result.challenge;
    if (!challenge || challenge.type !== TWO_FACTOR_CHALLENGE) return null;
    if (typeof result.continuation_token !== 'string' || !result.continuation_token) return null;

    const providers = [];
    for (const item of Array.isArray(challenge.providers) ? challenge.providers : []) {
        const provider = normalizeProvider(item);
        if (provider && !providers.some((existing) => existing.key === provider.key)) providers.push(provider);
    }
    const primary = typeof challenge.provider === 'string' ? challenge.provider : '';
    if (primary && !providers.some((provider) => provider.key === primary)) {
        providers.unshift(normalizeProvider({ key: primary }));
    }
    if (!providers.length) return null;

    const expiresAt = Date.parse(result.continuation_expires_at);
    return {
        policy: typeof result.challenge_policy === 'string' ? result.challenge_policy : '',
        provider: primary || providers[0].key,
        providers,
        continuationToken: result.continuation_token,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
    };
}

export function isChallengeExpired(challenge, now) {
    return Boolean(challenge && challenge.expiresAt !== null && now >= challenge.expiresAt);
}

function errorFields(error) {
    const data = error && typeof error === 'object' && error.data && typeof error.data === 'object' ? error.data : {};
    const status = Number(error?.status ?? data.status ?? 0) || 0;
    const code = typeof error?.code === 'string' ? error.code : '';
    return { status, code, data };
}

/**
 * Classify a failed continue/verify call. Codes win over statuses because a
 * dead continuation and a wrong code are both HTTP 401.
 */
export function classifyContinueError(error) {
    const { status, code, data } = errorFields(error);
    const rotated = typeof data.continuation_token === 'string' && data.continuation_token
        ? { continuationToken: data.continuation_token, expiresAt: Date.parse(data.continuation_expires_at) || null }
        : null;

    if (code === 'continuation_expired' || code === 'invalid_continuation' || code === 'continuation_rate_limited') {
        return { kind: 'expired' };
    }
    if (code === 'two_factor_password_reset_required' || (status === 403 && !code.startsWith('rest_'))) {
        return { kind: 'reset_required' };
    }
    if (code === 'two_factor_too_fast' || status === 429) {
        const retryAfter = Math.ceil(Number(data.retry_after));
        return { kind: 'rate_limited', retryAfter: retryAfter > 0 ? retryAfter : DEFAULT_RETRY_SECONDS, rotated };
    }
    if (code === 'continuation_in_progress' || status === 409) return { kind: 'busy' };
    if (code === 'two_factor_invalid' || code === 'challenge_rejected' || status === 401 || status === 400) {
        return { kind: 'invalid', rotated };
    }
    return { kind: 'failed' };
}

export function createSignInState(challenge) {
    return {
        challenge,
        provider: challenge.provider,
        code: '',
        status: 'idle',
        error: '',
        notice: '',
        retryUntil: 0,
        outcome: null,
    };
}

function withRotation(challenge, rotated) {
    if (!rotated) return challenge;
    return { ...challenge, continuationToken: rotated.continuationToken, expiresAt: rotated.expiresAt ?? challenge.expiresAt };
}

/** Reducer for the sign-in code step. Time is passed in so tests stay deterministic. */
export function signInReducer(state, action) {
    switch (action.type) {
        case 'select':
            if (!state.challenge.providers.some((provider) => provider.key === action.provider)) return state;
            return { ...state, provider: action.provider, code: '', error: '', notice: '' };
        case 'code':
            return { ...state, code: sanitizeCode(action.value), error: state.retryUntil ? state.error : '' };
        case 'submit':
            return { ...state, status: 'submitting', error: '', notice: '' };
        case 'resend':
            return { ...state, status: 'sending', error: '', notice: '' };
        case 'signed_in':
            return { ...state, status: 'idle', outcome: 'signed_in' };
        case 'code_sent':
            return { ...state, status: 'idle', notice: SIGN_IN_COPY.codeSent };
        case 'challenge': {
            const next = action.challenge;
            const provider = next.providers.some((item) => item.key === state.provider) ? state.provider : next.provider;
            return {
                ...state,
                challenge: next,
                provider,
                code: '',
                status: 'idle',
                notice: action.sent ? SIGN_IN_COPY.codeSent : '',
                error: action.sent ? '' : SIGN_IN_COPY.invalid,
            };
        }
        case 'expired':
            return { ...state, status: 'idle', outcome: 'expired' };
        case 'failed': {
            const failure = action.failure;
            const base = { ...state, status: 'idle' };
            switch (failure.kind) {
                case 'expired':
                    return { ...base, outcome: 'expired' };
                case 'reset_required':
                    return { ...base, outcome: 'reset_required' };
                case 'rate_limited':
                    return {
                        ...base,
                        challenge: withRotation(state.challenge, failure.rotated),
                        retryUntil: action.now + failure.retryAfter * 1000,
                        error: SIGN_IN_COPY.rateLimited,
                    };
                case 'invalid':
                    return { ...base, challenge: withRotation(state.challenge, failure.rotated), code: '', error: SIGN_IN_COPY.invalid };
                case 'busy':
                    return { ...base, error: SIGN_IN_COPY.busy };
                default:
                    return { ...base, error: SIGN_IN_COPY.failed };
            }
        }
        case 'tick':
            if (state.retryUntil && action.now >= state.retryUntil) return { ...state, retryUntil: 0, error: '' };
            return state;
        default:
            return state;
    }
}

export function secondsLeft(state, now) {
    return state.retryUntil > now ? Math.ceil((state.retryUntil - now) / 1000) : 0;
}

export function currentProvider(state) {
    return state.challenge.providers.find((provider) => provider.key === state.provider) ?? state.challenge.providers[0];
}

export function canSubmitCode(state, now) {
    return state.status === 'idle' && state.outcome === null && secondsLeft(state, now) === 0
        && codeReady(currentProvider(state).kind, state.code);
}

export function canResend(state, now) {
    return currentProvider(state).kind === 'email' && state.status === 'idle' && state.outcome === null && secondsLeft(state, now) === 0;
}

// ─── Settings → Security ──────────────────────────────────────────────────────

/** Normalize `GET /two-factor/1.0/users/<id>/providers`. */
export function parseProviderSettings(response) {
    const providers = [];
    for (const item of Array.isArray(response?.providers) ? response.providers : []) {
        const provider = normalizeProvider(item);
        if (!provider) continue;
        providers.push({
            ...provider,
            supported: item.supported !== false,
            configured: item.configured === true,
            enabled: item.enabled === true,
            primary: item.primary === true,
            remaining: typeof item.remaining === 'number' ? item.remaining : null,
        });
    }
    return {
        userId: Number(response?.user_id) || 0,
        providers,
        revalidationRequired: response?.revalidation?.required === true,
    };
}

export function settingsSummary(settings) {
    const enabled = settings.providers.filter((provider) => provider.enabled);
    const primary = enabled.find((provider) => provider.primary) ?? enabled.find((provider) => provider.kind !== 'backup') ?? enabled[0] ?? null;
    const find = (kind) => settings.providers.find((provider) => provider.kind === kind && provider.supported) ?? null;
    return {
        on: enabled.length > 0,
        primary,
        app: find('app'),
        email: find('email'),
        backup: find('backup'),
    };
}

function pickPrimary(enabledKeys, providers, preferred) {
    if (preferred && enabledKeys.includes(preferred)) return preferred;
    const kinds = new Map(providers.map((provider) => [provider.key, provider.kind]));
    return enabledKeys.find((key) => kinds.get(key) !== 'backup') ?? enabledKeys[0] ?? '';
}

/**
 * Compute the complete provider settings payload for a change. The upstream
 * route requires both fields, and the primary must be enabled. Turning off the
 * last real method also turns off backup codes, so they never stand alone.
 */
export function providerUpdate(settings, change) {
    const providers = settings.providers;
    let enabled = providers.filter((provider) => provider.enabled).map((provider) => provider.key);
    const currentPrimary = providers.find((provider) => provider.primary && provider.enabled)?.key ?? '';
    let preferred = currentPrimary;

    if (change.enable) {
        if (!enabled.includes(change.enable)) enabled = [...enabled, change.enable];
    } else if (change.disable) {
        enabled = enabled.filter((key) => key !== change.disable);
        if (preferred === change.disable) preferred = '';
        const kinds = new Map(providers.map((provider) => [provider.key, provider.kind]));
        if (!enabled.some((key) => kinds.get(key) !== 'backup')) enabled = [];
    } else if (change.primary) {
        if (!enabled.includes(change.primary)) enabled = [...enabled, change.primary];
        preferred = change.primary;
    }

    return { enabled_providers: enabled, primary_provider: pickPrimary(enabled, providers, preferred) };
}

/** Group a base32 secret for reading aloud or typing by hand. */
export function formatSecret(secret) {
    return String(secret ?? '').replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}

/** Only hand otpauth:// links to the OS; anything else stays in-app. */
export function safeOtpauthUri(uri) {
    return typeof uri === 'string' && /^otpauth:\/\/totp\//i.test(uri) ? uri : '';
}

export function backupCodesText(codes) {
    return ['Extra Chill backup codes', 'Each code works once.', '', ...codes].join('\n');
}

/** Member-facing message for management failures. */
export function securityError(error) {
    const { code, status } = errorFields(error);
    if (code === 'invalid_key_code' || code === 'two_factor_invalid') return "That code didn't work. Check it and try again.";
    if (code === 'totp_enrollment_not_found' || code === 'totp_enrollment_expired') return 'Setup timed out. Start again to get a new key.';
    if (code === 'two_factor_too_fast' || status === 429) return 'Too many tries. Wait a moment, then try again.';
    if (code === 'two_factor_session_required') return "We couldn't confirm it's you right now. Sign out and back in, then try again.";
    return "Something went wrong. Check your connection and try again.";
}

/** Normalize a `POST /two-factor/1.0/revalidate` challenge for the confirm sheet. */
export function parseRevalidateChallenge(response) {
    const providers = [];
    for (const item of Array.isArray(response?.providers) ? response.providers : []) {
        const provider = normalizeProvider(item);
        if (provider && !providers.some((existing) => existing.key === provider.key)) providers.push(provider);
    }
    const primary = typeof response?.provider === 'string' ? response.provider : '';
    if (primary && !providers.some((provider) => provider.key === primary)) providers.unshift(normalizeProvider({ key: primary }));
    return providers.length ? { provider: primary || providers[0].key, providers } : null;
}

/** One-line status for Settings → Security. */
export function statusLine(summary) {
    if (!summary.on) return "Two-step sign-in is off. Add a second step so a stolen password isn't enough to get into your account.";
    switch (summary.primary?.kind) {
        case 'app': return "Two-step sign-in is on. After your password, you'll enter a code from your authenticator app.";
        case 'email': return "Two-step sign-in is on. After your password, you'll enter a code we email you.";
        default: return "Two-step sign-in is on. After your password, you'll enter a sign-in code.";
    }
}
