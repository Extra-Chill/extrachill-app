const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scopes, mergeDates, eventTime, validEventId, safeLink, mergeEvent, eventError } = require('./model');
const event = (id, datetime) => ({ id, datetime });

test('detail merge supports cached-only, cold fetch, and authoritative refreshed fields', () => {
    const cached = { id: 1, title: 'Old', ticket_url: 'https://tickets.example', venue: { name: 'Venue' } };
    const fetched = { id: 1, title: 'New', ticket_url: '', venue: null, content_html: '<p>Description</p>' };
    assert.equal(mergeEvent(cached, null), cached);
    assert.equal(mergeEvent(undefined, fetched), fetched);
    assert.equal(mergeEvent(undefined, undefined), null);
    assert.deepEqual(mergeEvent(cached, fetched), fetched);
    assert.equal(cached.title, 'Old');
    assert.deepEqual(mergeEvent(cached, { id: 2, title: 'Other' }), { id: 2, title: 'Other' });
});
test('event errors distinguish unavailable events from retryable failures', () => {
    for (const error of [{ status: 404 }, { code: 'event_not_found' }]) {
        assert.deepEqual(eventError(error), { kind: 'not-found', message: "This event isn't available anymore." });
    }
    for (const error of [null, new Error('Network'), { status: 500 }, { status: 403 }]) {
        assert.deepEqual(eventError(error), { kind: 'retry', message: 'This event could not be loaded. Try again.' });
    }
});
test('scope chips use the calendar scope enum; upcoming omits a named scope', () => {
    assert.deepEqual(scopes.map(item => item.value), ['tonight', 'this-weekend', 'this-week', 'upcoming']);
});
test('paging merges split dates, deduplicates occurrences within a date, and sorts chronologically', () => {
    const current = [{ date: '2026-11-02', label: 'Monday', events: [event(2, '2026-11-02T21:00:00')] }];
    const incoming = [
        { date: '2026-11-02', label: 'Monday', events: [event(2, '2026-11-02T21:00:00'), event(1, '2026-11-02T19:00:00')] },
        { date: '2026-11-01', label: 'Sunday', events: [event(3, '2026-11-01T19:00:00')] },
    ];
    const result = mergeDates(current, incoming);
    assert.deepEqual(result.map(group => group.date), ['2026-11-01', '2026-11-02']);
    assert.deepEqual(result[1].events.map(item => item.id), [1, 2]);
    assert.equal(current[0].events.length, 1);
    assert.equal(incoming[0].events.length, 2);
});
test('multi-day events remain present on each date', () => {
    assert.equal(mergeDates([], ['2026-11-01', '2026-11-02'].map(date => ({ date, label: date, events: [event(1, date)] }))).length, 2);
    assert.deepEqual(mergeDates([], []), []);
});
test('server venue-local display is not shifted into device timezone', () => {
    const value = { datetime: '2026-11-01T19:30:00', venue: { timezone: 'America/New_York' }, occurrence_display: { formatted_time_display: '7:30 PM' } };
    assert.equal(eventTime(value), '7:30 PM · America/New_York');
    assert.equal(eventTime({ datetime: value.datetime, venue: null }), '2026-11-01 19:30:00');
});
test('route IDs must be positive safe integers', () => {
    for (const value of ['1', 76]) assert.equal(validEventId(value), true);
    for (const value of [undefined, null, '', '1.2', '-1', '0', '1e2', 'Infinity', '9007199254740992']) assert.equal(validEventId(value), false);
});
test('browser links only accept HTTP(S)', () => {
    assert.equal(safeLink('https://tickets.example/show'), 'https://tickets.example/show');
    for (const value of [null, '', 'javascript:alert(1)', 'file:///tmp/foo', '//example.com']) assert.equal(safeLink(value), null);
});
