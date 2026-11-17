import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Load the production TypeScript without React Native (type-only imports erase).
async function loadTS(file) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { installSocialSession, shellDeviceId } = await loadTS('./social-session.ts');

const EXPIRES = '2099-01-01T00:00:00Z';
const GOOGLE_RESPONSE = {
    success: true,
    access_token: 'access-1',
    access_expires_at: EXPIRES,
    refresh_token: 'refresh-1',
    refresh_expires_at: EXPIRES,
    user: { id: 7, username: 'member', display_name: 'Member' },
    onboarding_completed: true,
    redirect_url: '',
};

/**
 * A stand-in for wp-native-shell's useAuth() on a shell without
 * completeLogin (0.2.x): the client's AuthFetchTransport writes the shell's
 * storage keys, and refreshSession() only signs in when the transport has
 * tokens — the shell's own behavior.
 */
function legacyShell() {
    const storage = new Map();
    const events = [];
    const state = { isAuthenticated: false, user: null };
    let tokens = null;
    const transport = {
        hasTokens: () => tokens !== null,
        async setTokens(next) {
            events.push('setTokens');
            tokens = next;
            storage.set('wp_native_access_token', next.accessToken);
            storage.set('wp_native_refresh_token', next.refreshToken);
            storage.set('wp_native_access_expiry', String(next.accessExpiresAt));
        },
    };
    const client = {
        transport,
        async discover() { events.push('discover'); },
    };
    const auth = {
        client,
        async refreshSession() {
            events.push('refreshSession');
            if (!transport.hasTokens()) return; // the shell's early return
            state.isAuthenticated = true;
            state.user = { id: 7, email: 'm@x.test' };
        },
    };
    return { auth, storage, events, state };
}

test('older shells: tokens go to the shell transport, then discover and sign in', async () => {
    const { auth, storage, events, state } = legacyShell();
    await installSocialSession(auth, GOOGLE_RESPONSE);
    assert.deepEqual(events, ['setTokens', 'discover', 'refreshSession']);
    assert.equal(storage.get('wp_native_access_token'), 'access-1');
    assert.equal(storage.get('wp_native_refresh_token'), 'refresh-1');
    assert.equal(storage.get('wp_native_access_expiry'), String(Math.floor(Date.parse(EXPIRES) / 1000)));
    assert.equal(state.isAuthenticated, true);
});

test('regression: without the handoff the shell never signs in (the #122 bug)', async () => {
    const { auth, state } = legacyShell();
    // What the old provider hooks effectively did: tokens stored elsewhere, then refreshSession().
    await auth.refreshSession();
    assert.equal(state.isAuthenticated, false);
});

test('shells with completeLogin(): one call with the login success, then /me', async () => {
    const calls = [];
    const auth = {
        client: { transport: { setTokens: async () => assert.fail('must not reach into the transport') } },
        async completeLogin(result) { calls.push(['completeLogin', result]); },
        async refreshSession() { calls.push(['refreshSession']); },
    };
    await installSocialSession(auth, GOOGLE_RESPONSE);
    assert.deepEqual(calls, [
        ['completeLogin', {
            access_token: 'access-1',
            access_expires_at: EXPIRES,
            refresh_token: 'refresh-1',
            refresh_expires_at: EXPIRES,
            user: { id: 7, username: 'member', display_name: 'Member' },
        }],
        ['refreshSession'],
    ]);
});

test('completeLogin() errors propagate; a later /me failure does not undo the sign-in', async () => {
    const failing = new Error('Sign-in rejected');
    await assert.rejects(installSocialSession({
        client: null,
        completeLogin: async () => { throw failing; },
        refreshSession: async () => assert.fail('no refresh after a failed login'),
    }, GOOGLE_RESPONSE), failing);

    await installSocialSession({
        client: null,
        completeLogin: async () => {},
        refreshSession: async () => { throw new Error('offline'); },
    }, GOOGLE_RESPONSE);
});

test('older shells: a failed /me after storing tokens propagates', async () => {
    const { auth } = legacyShell();
    auth.refreshSession = async () => { throw new Error('offline'); };
    await assert.rejects(installSocialSession(auth, GOOGLE_RESPONSE), /offline/);
});

test('refuses to sign in without a usable session or transport', async () => {
    const { auth, events } = legacyShell();
    for (const bad of [
        { ...GOOGLE_RESPONSE, access_token: '' },
        { ...GOOGLE_RESPONSE, refresh_token: undefined },
        { ...GOOGLE_RESPONSE, access_expires_at: 'not a date' },
        null,
    ]) {
        await assert.rejects(installSocialSession(auth, bad), /did not return a session/);
    }
    assert.deepEqual(events, []);

    await assert.rejects(
        installSocialSession({ client: {}, refreshSession: async () => assert.fail('no refresh') }, GOOGLE_RESPONSE),
        /cannot store the session/,
    );
});

test('provider sign-in uses the shell device id (refresh is device-bound)', async () => {
    const fallback = async () => 'fallback-device';
    assert.equal(await shellDeviceId({ getDeviceId: async () => 'shell-device' }, fallback), 'shell-device');
    assert.equal(await shellDeviceId({}, fallback), 'fallback-device');
});

test('Google and Apple hooks hand sessions to the shell, not the legacy token store', () => {
    const source = readFileSync(new URL('./oauth.ts', import.meta.url), 'utf8');
    assert.equal(source.includes('ecClient.setTokens('), false);
    assert.equal(source.match(/installSocialSession\(auth, /g)?.length, 2);
    assert.equal(source.match(/shellDeviceId\(auth, getShellDeviceId\)/g)?.length, 2);
    for (const storage of ['./storage.ts', './storage.web.ts']) {
        assert.match(readFileSync(new URL(storage, import.meta.url), 'utf8'), /const SHELL_DEVICE_ID_KEY = 'wp_native_device_id';/);
    }
});
