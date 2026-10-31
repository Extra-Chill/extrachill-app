import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationRoute, isUnread, mergeNotifications, shouldRefreshCount } from './model.js';

test('maps numeric community topics and events to native routes', () => {
    assert.equal(notificationRoute('https://community.extrachill.com/topic/42/#reply-5'), '/community/topic/42');
    assert.equal(notificationRoute('https://events.extrachill.com/event/17/?ref=inbox'), '/calendar/event/17');
});
test('maps contracted story URLs only on the main host', () => {
    assert.equal(notificationRoute('https://extrachill.com/stories/86/?ref=inbox'), '/stories/86');
    for (const url of ['https://extrachill.com/stories/0', 'https://extrachill.com/stories/a-slug', 'https://evil.test/stories/86', 'https://extrachill.com/stories/86/extra']) {
        assert.equal(notificationRoute(url), null);
    }
});
test('hands off other hosts, slug permalinks and non-resource paths', () => {
    for (const url of [
        'https://extrachill.com/news', 'https://community.extrachill.com/topic/a-slug/',
        'https://community.extrachill.com/forum/42', 'https://events.extrachill.com/event/0',
        'https://community.extrachill.com.evil.test/topic/42', 'https://events.extrachill.com/event/17/extra',
        'https://evil.test/event/17', 'https://user@events.extrachill.com/event/17',
        'https://events.extrachill.com:8080/event/17', 'javascript:alert(1)', '', '/topic/42',
    ]) assert.equal(notificationRoute(url), null, url);
});
test('recognizes the server boolean and database read flag representations', () => {
    for (const is_read of [false, 0, '0']) assert.equal(isUnread({ is_read }), true);
    for (const is_read of [true, 1, '1']) assert.equal(isUnread({ is_read }), false);
});
test('merges pages without duplicates in newest-first order, with stable id ties', () => {
    const first = { id: 1, created_at: '2026-10-30 12:00:00', is_read: false };
    const second = { id: 2, created_at: '2026-10-31 12:00:00' };
    const third = { id: 3, created_at: second.created_at };
    assert.deepEqual(mergeNotifications([first, second], [{ ...first, is_read: true }, third]), [third, second, { ...first, is_read: true }]);
    assert.deepEqual(mergeNotifications([], []), []);
});
test('focus count requests are throttled to one minute', () => {
    assert.equal(shouldRefreshCount(null, 0), true);
    assert.equal(shouldRefreshCount(0, 59_999), false);
    assert.equal(shouldRefreshCount(0, 60_000), true);
    assert.equal(shouldRefreshCount(60_000, 60_001), false);
});
