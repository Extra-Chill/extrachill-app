import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_RETRY_SECONDS,
    SIGN_IN_COPY,
    canResend,
    canSubmitCode,
    classifyContinueError,
    createSignInState,
    currentProvider,
    formatSecret,
    isChallengeExpired,
    isChallengeRequired,
    methodCopy,
    parseProviderSettings,
    parseRevalidateChallenge,
    parseTwoFactorChallenge,
    providerKind,
    providerUpdate,
    safeOtpauthUri,
    sanitizeCode,
    secondsLeft,
    settingsSummary,
    signInReducer,
    statusLine,
    backupCodesText,
    securityError,
} from './model.js';

const loginChallenge = {
    challenge_required: true,
    challenge_policy: 'two-factor',
    challenge: {
        type: 'two_factor',
        provider: 'Two_Factor_Totp',
        providers: [
            { key: 'Two_Factor_Totp', label: 'Authenticator App' },
            { key: 'Two_Factor_Email', label: 'Email' },
            { key: 'Two_Factor_Backup_Codes', label: 'Recovery Codes' },
        ],
    },
    continuation_token: 'cont-1',
    continuation_expires_at: '2026-01-01T00:10:00Z',
};
const NOW = Date.parse('2026-01-01T00:00:00Z');

test('parses the two_factor challenge from password, Google, or Apple sign-in', () => {
    const challenge = parseTwoFactorChallenge(loginChallenge);
    assert.equal(challenge.provider, 'Two_Factor_Totp');
    assert.equal(challenge.policy, 'two-factor');
    assert.equal(challenge.continuationToken, 'cont-1');
    assert.equal(challenge.expiresAt, Date.parse('2026-01-01T00:10:00Z'));
    assert.deepEqual(challenge.providers.map((p) => p.kind), ['app', 'email', 'backup']);
});

test('ignores success payloads, other challenge types, and malformed challenges', () => {
    assert.equal(parseTwoFactorChallenge({ access_token: 'a' }), null);
    assert.equal(isChallengeRequired({ access_token: 'a' }), false);
    const other = { ...loginChallenge, challenge: { type: 'captcha' } };
    assert.equal(isChallengeRequired(other), true);
    assert.equal(parseTwoFactorChallenge(other), null);
    assert.equal(parseTwoFactorChallenge({ ...loginChallenge, continuation_token: '' }), null);
    assert.equal(parseTwoFactorChallenge({ ...loginChallenge, challenge: { type: 'two_factor', providers: [] } }), null);
});

test('a primary provider missing from the list is still offered; duplicates collapse', () => {
    const challenge = parseTwoFactorChallenge({
        ...loginChallenge,
        continuation_expires_at: 'not a date',
        challenge: { type: 'two_factor', provider: 'Two_Factor_Email', providers: [{ key: 'Two_Factor_Totp' }, { key: 'Two_Factor_Totp' }, null] },
    });
    assert.deepEqual(challenge.providers.map((p) => p.key), ['Two_Factor_Email', 'Two_Factor_Totp']);
    assert.equal(challenge.expiresAt, null);
    assert.equal(isChallengeExpired(challenge, NOW + 1e9), false);
});

test('method copy is plain language', () => {
    assert.equal(providerKind('Two_Factor_Totp'), 'app');
    assert.equal(providerKind('Two_Factor_Backup_Codes'), 'backup');
    assert.equal(providerKind('Two_Factor_Email'), 'email');
    assert.equal(providerKind('Two_Factor_FIDO_U2F'), 'other');
    assert.equal(methodCopy({ key: 'Two_Factor_Totp' }).title, 'Authenticator app');
    assert.equal(methodCopy({ key: 'Custom', label: 'Security key', kind: 'other' }).title, 'Security key');
    for (const copy of Object.values(SIGN_IN_COPY)) assert.doesNotMatch(copy, /TOTP|2FA|provider|nonce|token/i);
});

test('codes keep digits only and authenticator codes need exactly six', () => {
    assert.equal(sanitizeCode(' 123-456 '), '123456');
    assert.equal(sanitizeCode('1234567890123456'), '123456789012');
    const state = createSignInState(parseTwoFactorChallenge(loginChallenge));
    assert.equal(canSubmitCode(signInReducer(state, { type: 'code', value: '12345' }), NOW), false);
    assert.equal(canSubmitCode(signInReducer(state, { type: 'code', value: '123456' }), NOW), true);
    const backup = signInReducer(state, { type: 'select', provider: 'Two_Factor_Backup_Codes' });
    assert.equal(canSubmitCode(signInReducer(backup, { type: 'code', value: '12345678' }), NOW), true);
});

test('switching method clears the code and errors; unknown methods are ignored', () => {
    let state = createSignInState(parseTwoFactorChallenge(loginChallenge));
    state = signInReducer(state, { type: 'code', value: '123' });
    state = signInReducer(state, { type: 'failed', failure: { kind: 'invalid', rotated: null }, now: NOW });
    state = signInReducer(state, { type: 'select', provider: 'Two_Factor_Email' });
    assert.equal(state.code, '');
    assert.equal(state.error, '');
    assert.equal(currentProvider(state).kind, 'email');
    assert.equal(signInReducer(state, { type: 'select', provider: 'nope' }), state);
    assert.equal(canResend(state, NOW), true);
    assert.equal(canResend(signInReducer(state, { type: 'select', provider: 'Two_Factor_Totp' }), NOW), false);
});

test('error classification distinguishes wrong code from a dead sign-in', () => {
    assert.deepEqual(classifyContinueError({ status: 401, code: 'two_factor_invalid' }), { kind: 'invalid', rotated: null });
    assert.deepEqual(classifyContinueError({ status: 401, code: 'challenge_rejected' }), { kind: 'invalid', rotated: null });
    assert.deepEqual(classifyContinueError({ status: 401, code: 'continuation_expired' }), { kind: 'expired' });
    assert.deepEqual(classifyContinueError({ status: 401, code: 'invalid_continuation' }), { kind: 'expired' });
    assert.deepEqual(classifyContinueError({ status: 429, code: 'continuation_rate_limited' }), { kind: 'expired' });
    assert.deepEqual(classifyContinueError({ status: 403, code: 'two_factor_password_reset_required' }), { kind: 'reset_required' });
    assert.deepEqual(classifyContinueError({ status: 409, code: 'continuation_in_progress' }), { kind: 'busy' });
    assert.deepEqual(classifyContinueError(new Error('Network request failed')), { kind: 'failed' });
});

test('429 uses retry_after, falling back to a default when the transport drops data', () => {
    assert.deepEqual(classifyContinueError({ status: 429, code: 'two_factor_too_fast', data: { retry_after: 12.2 } }),
        { kind: 'rate_limited', retryAfter: 13, rotated: null });
    assert.equal(classifyContinueError({ status: 429, code: 'two_factor_too_fast' }).retryAfter, DEFAULT_RETRY_SECONDS);
    assert.equal(classifyContinueError({ code: 'two_factor_too_fast', data: { status: 429, retry_after: -1 } }).retryAfter, DEFAULT_RETRY_SECONDS);
});

test('invalid code stays on the step, clears input, and adopts a rotated continuation', () => {
    let state = createSignInState(parseTwoFactorChallenge(loginChallenge));
    state = signInReducer(state, { type: 'code', value: '000000' });
    state = signInReducer(state, { type: 'submit' });
    assert.equal(state.status, 'submitting');
    assert.equal(canSubmitCode(state, NOW), false);
    const failure = classifyContinueError({ status: 401, code: 'two_factor_invalid', data: { continuation_token: 'cont-2', continuation_expires_at: '2026-01-01T00:20:00Z' } });
    state = signInReducer(state, { type: 'failed', failure, now: NOW });
    assert.equal(state.outcome, null);
    assert.equal(state.status, 'idle');
    assert.equal(state.code, '');
    assert.equal(state.error, SIGN_IN_COPY.invalid);
    assert.equal(state.challenge.continuationToken, 'cont-2');
    assert.equal(state.challenge.expiresAt, Date.parse('2026-01-01T00:20:00Z'));
});

test('rate limit counts down and unlocks', () => {
    let state = createSignInState(parseTwoFactorChallenge(loginChallenge));
    state = signInReducer(state, { type: 'failed', failure: { kind: 'rate_limited', retryAfter: 5, rotated: null }, now: NOW });
    state = signInReducer(state, { type: 'code', value: '123456' });
    assert.equal(state.error, SIGN_IN_COPY.rateLimited, 'typing keeps the wait message');
    assert.equal(secondsLeft(state, NOW), 5);
    assert.equal(secondsLeft(state, NOW + 1500), 4);
    assert.equal(canSubmitCode(state, NOW + 1000), false);
    assert.equal(signInReducer(state, { type: 'tick', now: NOW + 4000 }), state);
    state = signInReducer(state, { type: 'tick', now: NOW + 5000 });
    assert.equal(state.retryUntil, 0);
    assert.equal(state.error, '');
    assert.equal(canSubmitCode(state, NOW + 5000), true);
});

test('expired and reset-required are terminal outcomes', () => {
    const state = createSignInState(parseTwoFactorChallenge(loginChallenge));
    assert.equal(signInReducer(state, { type: 'failed', failure: { kind: 'expired' }, now: NOW }).outcome, 'expired');
    const reset = signInReducer(state, { type: 'failed', failure: { kind: 'reset_required' }, now: NOW });
    assert.equal(reset.outcome, 'reset_required');
    assert.equal(canSubmitCode(signInReducer(reset, { type: 'code', value: '123456' }), NOW), false);
    assert.equal(isChallengeExpired(state.challenge, Date.parse('2026-01-01T00:10:00Z')), true);
    assert.equal(signInReducer(state, { type: 'expired' }).outcome, 'expired');
    assert.equal(signInReducer(state, { type: 'signed_in' }).outcome, 'signed_in');
});

test('resend shows a notice and keeps the chosen method across a re-issued challenge', () => {
    let state = createSignInState(parseTwoFactorChallenge(loginChallenge));
    state = signInReducer(state, { type: 'select', provider: 'Two_Factor_Email' });
    state = signInReducer(state, { type: 'resend' });
    assert.equal(state.status, 'sending');
    assert.equal(signInReducer(state, { type: 'code_sent' }).notice, SIGN_IN_COPY.codeSent);
    const reissued = parseTwoFactorChallenge({ ...loginChallenge, continuation_token: 'cont-3' });
    const next = signInReducer(state, { type: 'challenge', challenge: reissued, sent: true });
    assert.equal(next.challenge.continuationToken, 'cont-3');
    assert.equal(next.provider, 'Two_Factor_Email');
    assert.equal(next.notice, SIGN_IN_COPY.codeSent);
    const rejected = signInReducer(state, { type: 'challenge', challenge: reissued });
    assert.equal(rejected.error, SIGN_IN_COPY.invalid);
});

test('failures without a known kind show the connection message; busy shows wait', () => {
    const state = createSignInState(parseTwoFactorChallenge(loginChallenge));
    assert.equal(signInReducer(state, { type: 'failed', failure: { kind: 'failed' }, now: NOW }).error, SIGN_IN_COPY.failed);
    assert.equal(signInReducer(state, { type: 'failed', failure: { kind: 'busy' }, now: NOW }).error, SIGN_IN_COPY.busy);
    assert.equal(signInReducer(state, { type: 'nope' }), state);
});

// ─── Settings → Security ─────────────────────────────────────────────────────

const providersResponse = (overrides = {}) => ({
    user_id: 7,
    providers: [
        { key: 'Two_Factor_Email', label: 'Email', supported: true, configured: true, enabled: false, primary: false, remaining: null },
        { key: 'Two_Factor_Totp', label: 'Authenticator App', supported: true, configured: false, enabled: false, primary: false, remaining: null },
        { key: 'Two_Factor_Backup_Codes', label: 'Recovery Codes', supported: true, configured: false, enabled: false, primary: false, remaining: 0 },
        { key: 'Two_Factor_Dummy', label: 'Dummy', supported: false, configured: false, enabled: false, primary: false, remaining: null },
    ].map((provider) => ({ ...provider, ...(overrides[provider.key] ?? {}) })),
    revalidation: { required: false },
});

test('status reports off with no enabled methods and hides unsupported ones', () => {
    const settings = parseProviderSettings(providersResponse());
    const summary = settingsSummary(settings);
    assert.equal(settings.userId, 7);
    assert.equal(summary.on, false);
    assert.equal(summary.app.key, 'Two_Factor_Totp');
    assert.equal(summary.backup.remaining, 0);
    assert.match(statusLine(summary), /off/);
    assert.equal(parseProviderSettings(null).providers.length, 0);
});

test('status names the primary method in plain words', () => {
    const settings = parseProviderSettings(providersResponse({
        Two_Factor_Totp: { configured: true, enabled: true, primary: true },
        Two_Factor_Backup_Codes: { configured: true, enabled: true, remaining: 10 },
    }));
    const summary = settingsSummary(settings);
    assert.equal(summary.on, true);
    assert.equal(summary.primary.kind, 'app');
    assert.match(statusLine(summary), /authenticator app/);
    assert.match(statusLine(settingsSummary(parseProviderSettings(providersResponse({ Two_Factor_Email: { enabled: true } })))), /email/);
});

test('enabling the first method makes it primary', () => {
    const settings = parseProviderSettings(providersResponse());
    assert.deepEqual(providerUpdate(settings, { enable: 'Two_Factor_Email' }), { enabled_providers: ['Two_Factor_Email'], primary_provider: 'Two_Factor_Email' });
});

test('enabling another method keeps the existing primary; set primary switches it', () => {
    const settings = parseProviderSettings(providersResponse({
        Two_Factor_Email: { enabled: true, primary: true },
        Two_Factor_Totp: { configured: true },
    }));
    assert.deepEqual(providerUpdate(settings, { enable: 'Two_Factor_Totp' }), { enabled_providers: ['Two_Factor_Email', 'Two_Factor_Totp'], primary_provider: 'Two_Factor_Email' });
    assert.deepEqual(providerUpdate(settings, { primary: 'Two_Factor_Totp' }), { enabled_providers: ['Two_Factor_Email', 'Two_Factor_Totp'], primary_provider: 'Two_Factor_Totp' });
});

test('turning off the primary promotes a real method, never backup codes', () => {
    const settings = parseProviderSettings(providersResponse({
        Two_Factor_Backup_Codes: { configured: true, enabled: true },
        Two_Factor_Email: { enabled: true },
        Two_Factor_Totp: { configured: true, enabled: true, primary: true },
    }));
    assert.deepEqual(providerUpdate(settings, { disable: 'Two_Factor_Totp' }), { enabled_providers: ['Two_Factor_Email', 'Two_Factor_Backup_Codes'], primary_provider: 'Two_Factor_Email' });
    assert.deepEqual(providerUpdate(settings, { disable: 'Two_Factor_Backup_Codes' }), { enabled_providers: ['Two_Factor_Email', 'Two_Factor_Totp'], primary_provider: 'Two_Factor_Totp' });
});

test('turning off the last real method turns two-step sign-in off entirely', () => {
    const settings = parseProviderSettings(providersResponse({
        Two_Factor_Backup_Codes: { configured: true, enabled: true },
        Two_Factor_Totp: { configured: true, enabled: true, primary: true },
    }));
    assert.deepEqual(providerUpdate(settings, { disable: 'Two_Factor_Totp' }), { enabled_providers: [], primary_provider: '' });
});

test('setup helpers format the key, allow only otpauth links, and share codes', () => {
    assert.equal(formatSecret('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
    assert.equal(formatSecret(' ABCDE '), 'ABCD E');
    assert.equal(safeOtpauthUri('otpauth://totp/Extra%20Chill:chris?secret=JBSW'), 'otpauth://totp/Extra%20Chill:chris?secret=JBSW');
    assert.equal(safeOtpauthUri('https://evil.example/otpauth://totp/'), '');
    assert.equal(safeOtpauthUri(undefined), '');
    assert.equal(backupCodesText(['11111111', '22222222']).split('\n').slice(-2).join(','), '11111111,22222222');
});

test('revalidate challenge and management errors map to plain words', () => {
    const challenge = parseRevalidateChallenge({ result: 'challenge', provider: 'Two_Factor_Email', providers: [{ key: 'Two_Factor_Totp', label: 'App' }] });
    assert.deepEqual(challenge.providers.map((p) => p.key), ['Two_Factor_Email', 'Two_Factor_Totp']);
    assert.equal(challenge.provider, 'Two_Factor_Email');
    assert.equal(parseRevalidateChallenge({}), null);
    assert.match(securityError({ code: 'invalid_key_code', status: 400 }), /didn't work/);
    assert.match(securityError({ code: 'totp_enrollment_not_found' }), /timed out/);
    assert.match(securityError({ status: 429 }), /Too many/);
    assert.match(securityError({ code: 'two_factor_session_required' }), /Sign out/);
    assert.match(securityError(new Error('x')), /connection/);
});
