import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const eas = JSON.parse(read('eas.json'));
const { outputText } = ts.transpileModule(read('app.config.ts'), {
    compilerOptions: { module: ts.ModuleKind.ESNext },
});
const { default: configure } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('FCM file configuration is optional and preserves Android metadata', () => {
    const previous = process.env.GOOGLE_SERVICES_JSON;
    try {
        delete process.env.GOOGLE_SERVICES_JSON;
        assert.deepEqual(configure({ config: app }).android, app.android);
        process.env.GOOGLE_SERVICES_JSON = '/private/eas/google-services.json';
        assert.deepEqual(configure({ config: app }).android, {
            ...app.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
        });
        assert.equal(configure({ config: app }).ios, app.ios);
    } finally {
        if (previous === undefined) delete process.env.GOOGLE_SERVICES_JSON;
        else process.env.GOOGLE_SERVICES_JSON = previous;
    }
});

test('Android builds use APKs for testing and a remotely versioned store bundle', () => {
    assert.equal(eas.build.development.developmentClient, true);
    for (const profile of ['development', 'preview']) {
        assert.equal(eas.build[profile].distribution, 'internal');
        assert.equal(eas.build[profile].android.buildType, 'apk');
    }
    assert.equal(eas.build.production.android.buildType, 'app-bundle');
    assert.equal(eas.build.production.distribution, 'store');
    assert.equal(eas.build.production.autoIncrement, true);
    assert.equal(eas.cli.appVersionSource, 'remote');
    assert.equal(app.android.versionCode, undefined);
    assert.equal(app.android.package, 'com.extrachill.app');
    assert.equal(app.android.edgeToEdgeEnabled, true);
    assert.ok(app.android.adaptiveIcon.foregroundImage);
    assert.equal(app.splash.dark.backgroundColor, '#1a1a1a');
    assert.equal(eas.submit.production.android.track, 'internal');
    assert.match(eas.submit.production.android.serviceAccountKeyPath, /REPLACE_WITH/);
});

test('post-install skips native iOS work on Android and invokes iOS-only prebuild on iOS', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ec-post-install-'));
    const hook = JSON.parse(read('package.json')).scripts['eas-build-post-install'];
    try {
        writeFileSync(join(dir, 'npx'), '#!/bin/sh\nprintf "%s\\n" "$*"\n', { mode: 0o755 });
        const run = platform => execFileSync('/bin/sh', ['-c', hook], {
            env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, EAS_BUILD_PLATFORM: platform },
            encoding: 'utf8',
        });
        assert.equal(run('android'), '');
        assert.equal(run('ios').trim(), 'expo prebuild --platform ios --no-install');
        assert.equal(run(''), '');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('Apple UI is gated by iOS availability, not just server enablement', () => {
    assert.match(read('src/auth/oauth.ts'), /const appleEnabled = Platform\.OS === 'ios' && !!config\?\.apple\.enabled && available;/);
    assert.match(read('app/login.tsx'), /\{appleEnabled && \(/);
});
