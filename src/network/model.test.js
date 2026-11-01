const { test } = require('node:test');
const assert = require('node:assert/strict');
const { siteClientEntry } = require('./model');
const { moderationAvailable } = require('../community/moderation-model');

function fakeBase(discover = async () => {}) {
    const calls = { derive: 0, discover: 0 };
    return {
        calls,
        derive() {
            calls.derive++;
            let discovered = false;
            return {
                async discover() { calls.discover++; await discover(); discovered = true; },
                describe() { return discovered ? { name: 'ability' } : undefined; },
            };
        },
    };
}

test('cache shares derived clients and in-flight discovery per base and root', async () => {
    let finish;
    const base = fakeBase(() => new Promise(resolve => { finish = resolve; }));
    const first = siteClientEntry(base, 'community');
    assert.equal(first, siteClientEntry(base, 'community'));
    const pending = first.discover();
    assert.equal(pending, first.discover());
    await Promise.resolve();
    assert.equal(base.calls.discover, 1);
    assert.equal(first.getSnapshot().ready, false);
    finish();
    await pending;
    await first.discover();
    assert.equal(first.getSnapshot().ready, true);
    assert.equal(base.calls.derive, 1);
    assert.equal(base.calls.discover, 1);
    const otherRoot = siteClientEntry(base, 'events');
    assert.notEqual(otherRoot, first);
    const nextBase = fakeBase();
    const next = siteClientEntry(nextBase, 'community');
    assert.notEqual(next.client, first.client);
    assert.equal(next.getSnapshot().ready, false);
    await next.discover();
    assert.equal(nextBase.calls.discover, 1);
});

test('failure is exposed and retry notifies all subscribers', async () => {
    let fail = true;
    const base = fakeBase(() => { if (fail) throw new Error('offline'); });
    const entry = siteClientEntry(base, 'community');
    let notifications = 0;
    const unsubscribe = entry.subscribe(() => notifications++);
    await entry.discover();
    assert.equal(entry.getSnapshot().ready, false);
    assert.equal(entry.getSnapshot().error.message, 'offline');
    fail = false;
    const retry = entry.discover();
    assert.equal(entry.getSnapshot().error, undefined);
    assert.equal(retry, entry.discover());
    await retry;
    assert.equal(entry.getSnapshot().ready, true);
    assert.equal(base.calls.discover, 2);
    assert.equal(notifications, 4);
    unsubscribe();
});

test('moderation becomes available only after derived discovery', async () => {
    const entry = siteClientEntry(fakeBase(), 'community');
    assert.deepEqual(moderationAvailable(entry.client, entry.getSnapshot().ready), {
        report: false, block: false, unblock: false, list: false,
    });
    await entry.discover();
    assert.deepEqual(moderationAvailable(entry.client, entry.getSnapshot().ready), {
        report: true, block: true, unblock: true, list: true,
    });
    assert.equal(moderationAvailable(entry.client, false).report, false);
    assert.equal(moderationAvailable({ describe: () => undefined }, true).report, false);
});
