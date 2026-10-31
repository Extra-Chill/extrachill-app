import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Exercise the production TypeScript's pure helpers/client without loading RN.
async function loadTS(file) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { hashAppleNonce, buildAppleLoginRequest, withAppleCancellation } = await loadTS('./apple.ts');
const { ECRestClient } = await loadTS('./ec-rest-client.ts');

const sha256 = async value => createHash('sha256').update(value).digest('hex');

test('Apple nonce is SHA-256 hex; the request retains the raw nonce', async () => {
    assert.equal(await hashAppleNonce('abc', sha256),
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const body = buildAppleLoginRequest({
        identityToken: 'apple-token',
        fullName: { givenName: 'Extra', familyName: 'Chill' },
    }, 'abc', 'device-id');
    assert.deepEqual(body, {
        identity_token: 'apple-token', nonce: 'abc', device_id: 'device-id',
        given_name: 'Extra', family_name: 'Chill',
        registration_source: 'extrachill-app', registration_method: 'apple',
    });
});

test('repeat authorizations omit unavailable names and require an identity token', () => {
    const body = buildAppleLoginRequest({ identityToken: 'token', fullName: null }, 'raw', 'device');
    assert.equal('given_name' in body, false);
    assert.equal('family_name' in body, false);
    assert.throws(() => buildAppleLoginRequest({ identityToken: null }, 'raw', 'device'), /No identity token/);
});

test('Apple cancellation is a silent no-result; other errors propagate', async () => {
    assert.equal(await withAppleCancellation(async () => {
        throw { code: 'ERR_REQUEST_CANCELED' };
    }), null);
    const error = Object.assign(new Error('Apple failed'), { code: 'ERR_REQUEST_FAILED' });
    await assert.rejects(withAppleCancellation(async () => { throw error; }), error);
    const result = { onboardingCompleted: false };
    assert.equal(await withAppleCancellation(async () => result), result);
});

test('REST client uses canonical config and Apple paths and sends the exact JSON body', async t => {
    const calls = [];
    const response = { access_token: 'access', onboarding_completed: false };
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => response };
    });
    const client = new ECRestClient({
        baseUrl: 'https://extrachill.com/wp-json',
        getDeviceId: () => 'device', loadTokens: () => null,
        saveTokens: () => {}, clearTokens: () => {},
    });
    await client.getOAuthConfig();
    assert.equal(calls[0].url, 'https://extrachill.com/wp-json/extrachill/v1/config/oauth');
    assert.equal(calls[0].options.method, 'GET');
    const body = buildAppleLoginRequest({ identityToken: 'token' }, 'raw', 'device');
    assert.equal(await client.loginWithApple(body), response);
    assert.equal(calls[1].url, 'https://extrachill.com/wp-json/extrachill/v1/auth/apple');
    assert.equal(calls[1].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[1].options.body), body);
});

test('REST client surfaces WordPress provider error messages', async t => {
    t.mock.method(globalThis, 'fetch', async () => ({
        ok: false, status: 401,
        json: async () => ({ code: 'invalid_token', message: 'Invalid Apple token', data: { status: 401 } }),
    }));
    const client = new ECRestClient({ baseUrl: 'https://example.com' });
    await assert.rejects(client.loginWithApple({}), /Invalid Apple token/);
});
