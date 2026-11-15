import test from 'node:test';
import assert from 'node:assert/strict';
import { createPushLifecycle, openPush } from './model.js';

function fixture() {
    const calls = [];
    const client = { execute: async (...args) => { calls.push(args); }, describe: () => true };
    return { calls, client };
}
test('registers Expo tokens, deduplicates, rotates, then unregisters before logout', async () => {
    const { calls, client } = fixture();
    const manager = createPushLifecycle(client);
    await manager.register('ExpoPushToken[first]');
    await manager.register('ExpoPushToken[first]');
    const rotation = manager.register('ExpoPushToken[second]');
    await manager.unregister();
    calls.push(['logout']);
    await rotation;
    await manager.register('too-late');
    assert.deepEqual(calls, [
        ['wp-native-auth/register-push-token', { token: 'ExpoPushToken[first]', provider: 'expo' }],
        ['wp-native-auth/register-push-token', { token: 'ExpoPushToken[second]', provider: 'expo' }],
        ['wp-native-auth/unregister-push-token', {}], ['logout'],
    ]);
});
test('failed registration can retry and does not prevent unregister', async () => {
    let attempts = 0;
    const calls = [];
    const manager = createPushLifecycle({ execute: async (ability) => {
        calls.push(ability);
        if (++attempts === 1) throw new Error('offline');
    } });
    await assert.rejects(manager.register('token'));
    await manager.register('token');
    await manager.unregister();
    assert.equal(calls.length, 3);
    assert.equal(calls[2], 'wp-native-auth/unregister-push-token');
});
test('stop prevents late token acquisition from registering', async () => {
    const { calls, client } = fixture();
    const manager = createPushLifecycle(client);
    manager.stop();
    await manager.register('late');
    assert.deepEqual(calls, []);
});
test('tap URLs share Inbox native routing, including canonical event URL', async () => {
    const { calls, client } = fixture();
    const routes = [];
    const dependencies = { client, push: path => routes.push(path), handoff: async () => assert.fail('unexpected handoff') };
    await openPush({ url: 'https://community.extrachill.com/topic/42/', notification_id: '12' }, dependencies);
    await openPush({ url: 'https://events.extrachill.com/event/7/', notification_id: 13 }, dependencies);
    await openPush({ url: 'https://extrachill.com/stories/9/' }, dependencies);
    assert.deepEqual(routes, ['/community/topic/42', { pathname: '/calendar/event/[eventId]', params: { eventId: '7', url: 'https://events.extrachill.com/event/7/' } }, '/stories/9']);
    assert.deepEqual(calls, [ ['extrachill/mark-notifications-read', { notification_id: 12 }], ['extrachill/mark-notifications-read', { notification_id: 13 }] ]);
});
test('unknown canonical URLs hand off; mark-read is optional; unsafe URLs ignored', async () => {
    const { calls, client } = fixture();
    client.describe = () => false;
    const urls = [];
    const dependencies = { client, push: () => assert.fail('unexpected native route'), handoff: async url => { urls.push(url); } };
    await openPush({ url: 'https://community.extrachill.com/topic/slug/', notification_id: 2 }, dependencies);
    for (const url of ['javascript:alert(1)', 'not a URL', 'https://user:pass@extrachill.com/stories/9/']) await openPush({ url }, dependencies);
    await openPush(null, dependencies);
    assert.deepEqual(urls, ['https://community.extrachill.com/topic/slug/']);
    assert.deepEqual(calls, []);
});
