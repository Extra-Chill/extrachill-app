import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Load the production TypeScript client without React Native (type-only imports erase).
async function loadTS(file) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const client = await loadTS('./client.ts');
const {
    TwoFactorRequestError, continueTwoFactorSignIn, createContinueRequest, createShellSignInTransport,
    isRevalidationRequired, isRouteMissing, runWithRevalidation, shellRestRequester,
    getProviderSettings, updateProviderSettings, beginAuthenticatorSetup, confirmAuthenticatorSetup,
    generateBackupCodes, startRevalidation, sendRevalidationCode, submitRevalidation, normalizeContinueResult,
} = client;

const challenge = {
    challenge_required: true, challenge_policy: 'two-factor',
    challenge: { type: 'two_factor', provider: 'Two_Factor_Email', providers: [] },
    continuation_token: 'cont-2', continuation_expires_at: '2026-01-01T00:10:00Z',
};

test('verify goes through the shell continueLogin with { provider, code }', async () => {
    const calls = [];
    const transport = createShellSignInTransport({
        continueLogin: async (token, response) => { calls.push([token, response]); },
        continueRequest: async () => assert.fail('resend path must not be used'),
    });
    assert.deepEqual(await continueTwoFactorSignIn(transport, 'cont-1', { provider: 'Two_Factor_Totp', code: '123456' }), { status: 'signed_in' });
    assert.deepEqual(calls, [['cont-1', { provider: 'Two_Factor_Totp', code: '123456' }]]);
});

test('verify surfaces a re-issued challenge from a future shell and propagates errors untouched', async () => {
    const transport = createShellSignInTransport({ continueLogin: async () => challenge, continueRequest: async () => null });
    assert.deepEqual(await transport.verify('cont-1', { provider: 'x', code: '1' }), { status: 'challenge', challenge });
    const error = Object.assign(new Error('Invalid code'), { status: 401, code: 'two_factor_invalid' });
    const failing = createShellSignInTransport({ continueLogin: async () => { throw error; }, continueRequest: async () => null });
    await assert.rejects(continueTwoFactorSignIn(failing, 'cont-1', { provider: 'x', code: '1' }), error);
});

test('resend posts the ability input with the shell device + client and never touches continueLogin', async (t) => {
    const calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        calls.push({ url, options });
        return { ok: true, status: 200, json: async () => ({ status: 'code_sent' }) };
    });
    const continueRequest = createContinueRequest({ baseUrl: 'https://extrachill.com/wp-json/', clientId: 'extrachill-app', getDeviceId: async () => 'device-1' });
    const transport = createShellSignInTransport({ continueLogin: async () => assert.fail('no session for resend'), continueRequest });
    assert.deepEqual(await continueTwoFactorSignIn(transport, 'cont-1', { provider: 'Two_Factor_Email', resend: true }), { status: 'code_sent' });
    assert.equal(calls[0].url, 'https://extrachill.com/wp-json/wp-abilities/v1/abilities/wp-native/auth-continue-login/run');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['WP-Native-Client'], 'extrachill-app');
    assert.deepEqual(JSON.parse(calls[0].options.body), {
        input: { continuation_token: 'cont-1', device_id: 'device-1', challenge_response: { provider: 'Two_Factor_Email', resend: true } },
    });
});

test('the REST route variant posts the flat body to extrachill/v1/auth/login/continue', async () => {
    const calls = [];
    const continueRequest = createContinueRequest({
        baseUrl: 'https://extrachill.com/wp-json', clientId: 'c', getDeviceId: async () => 'd', route: 'rest',
        fetchImpl: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => challenge }; },
    });
    const transport = createShellSignInTransport({ continueLogin: async () => null, continueRequest });
    assert.deepEqual(await transport.resend('cont-1', 'Two_Factor_Email'), { status: 'challenge', challenge });
    assert.equal(calls[0].url, 'https://extrachill.com/wp-json/extrachill/v1/auth/login/continue');
    assert.deepEqual(calls[0].body, { continuation_token: 'cont-1', device_id: 'd', challenge_response: { provider: 'Two_Factor_Email', resend: true } });
});

test('raw continue errors keep WordPress code and data (retry_after, rotated continuation)', async () => {
    const continueRequest = createContinueRequest({
        baseUrl: 'https://x.test/wp-json', clientId: 'c', getDeviceId: async () => 'd',
        fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ code: 'two_factor_too_fast', message: 'Slow down', data: { status: 429, retry_after: 20 } }) }),
    });
    await assert.rejects(continueRequest('cont-1', { provider: 'p', resend: true }), (error) => {
        assert.ok(error instanceof TwoFactorRequestError);
        assert.equal(error.status, 429);
        assert.equal(error.code, 'two_factor_too_fast');
        assert.equal(error.data.retry_after, 20);
        return true;
    });
    const noJson = createContinueRequest({
        baseUrl: 'https://x.test/wp-json', clientId: 'c', getDeviceId: async () => 'd',
        fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new Error('html'); } }),
    });
    await assert.rejects(noJson('t', { provider: 'p', resend: true }), { status: 502, code: 'request_failed' });
    assert.deepEqual(normalizeContinueResult(undefined), { status: 'code_sent' });
});

test('Security REST wrappers call the Two Factor routes with the contract bodies', async () => {
    const calls = [];
    const request = async (req) => { calls.push(req); return { ok: true }; };
    await getProviderSettings(request, 7);
    await updateProviderSettings(request, 7, { enabled_providers: ['Two_Factor_Email'], primary_provider: 'Two_Factor_Email' });
    await beginAuthenticatorSetup(request, 7);
    await confirmAuthenticatorSetup(request, 7, '123456');
    await generateBackupCodes(request, 7);
    await startRevalidation(request);
    await startRevalidation(request, 'Two_Factor_Totp');
    await sendRevalidationCode(request, 'Two_Factor_Email');
    await submitRevalidation(request, 'Two_Factor_Totp', '654321');
    assert.deepEqual(calls, [
        { path: 'two-factor/1.0/users/7/providers', method: 'GET' },
        { path: 'two-factor/1.0/users/7/providers', method: 'POST', body: { enabled_providers: ['Two_Factor_Email'], primary_provider: 'Two_Factor_Email' } },
        { path: 'two-factor/1.0/totp/enrollment', method: 'POST', body: { user_id: 7 } },
        { path: 'two-factor/1.0/totp', method: 'POST', body: { user_id: 7, code: '123456', enable_provider: true } },
        { path: 'two-factor/1.0/generate-backup-codes', method: 'POST', body: { user_id: 7, enable_provider: true } },
        { path: 'two-factor/1.0/revalidate', method: 'POST', body: {} },
        { path: 'two-factor/1.0/revalidate', method: 'POST', body: { provider: 'Two_Factor_Totp' } },
        { path: 'two-factor/1.0/revalidate', method: 'POST', body: { provider: 'Two_Factor_Email', resend: true } },
        { path: 'two-factor/1.0/revalidate', method: 'POST', body: { provider: 'Two_Factor_Totp', code: '654321' } },
    ]);
});

test('feature detection: 404 / rest_no_route hides Security controls', () => {
    assert.equal(isRouteMissing({ status: 404, code: 'rest_no_route' }), true);
    assert.equal(isRouteMissing({ status: 404, code: 'rest_user_invalid_id' }), true);
    assert.equal(isRouteMissing({ status: 403, code: 'revalidation_required' }), false);
    assert.equal(isRouteMissing(new Error('offline')), false);
});

test('shellRestRequester uses the authenticated shell transport, or reports missing routes', async () => {
    const seen = [];
    const fakeClient = { transport: { request: async (req) => { seen.push(req); return { user_id: 7 }; } } };
    const request = shellRestRequester(fakeClient);
    assert.deepEqual(await getProviderSettings(request, 7), { user_id: 7 });
    assert.equal(seen[0].path, 'two-factor/1.0/users/7/providers');
    await assert.rejects(shellRestRequester({})({ path: 'x', method: 'GET' }), (error) => isRouteMissing(error));
});

test('revalidation_required is detected by code or structured data', () => {
    assert.equal(isRevalidationRequired({ status: 403, code: 'revalidation_required' }), true);
    assert.equal(isRevalidationRequired({ status: 403, code: 'x', data: { revalidation: { required: true, rest_route: '/two-factor/1.0/revalidate' } } }), true);
    assert.equal(isRevalidationRequired({ status: 403, code: 'rest_forbidden' }), false);
});

test('runWithRevalidation asks once, then retries the original action', async () => {
    let attempts = 0;
    let asked = 0;
    const action = async () => {
        attempts += 1;
        if (attempts === 1) throw Object.assign(new Error('Two Factor Revalidation required.'), { status: 403, code: 'revalidation_required' });
        return 'saved';
    };
    assert.equal(await runWithRevalidation(action, async () => { asked += 1; return true; }), 'saved');
    assert.equal(attempts, 2);
    assert.equal(asked, 1);
});

test('runWithRevalidation: dismissed sheet resolves undefined; other errors and second refusals throw', async () => {
    const revalidate = () => Object.assign(new Error('r'), { code: 'revalidation_required' });
    let attempts = 0;
    assert.equal(await runWithRevalidation(async () => { attempts += 1; throw revalidate(); }, async () => false), undefined);
    assert.equal(attempts, 1);
    const other = Object.assign(new Error('nope'), { status: 400, code: 'invalid_key_code' });
    await assert.rejects(runWithRevalidation(async () => { throw other; }, async () => assert.fail('no sheet')), other);
    await assert.rejects(runWithRevalidation(async () => { throw revalidate(); }, async () => true), { code: 'revalidation_required' });
});
