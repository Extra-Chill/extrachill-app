import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectEvents, trimChronological, sectionState } from './model.js';

const event = (id, datetime) => ({ id, datetime });
const groups = events => [{ date: '2026-11-01', events }];

test('tonight takes precedence over weekend, sorted and capped at five', () => {
    const tonight = groups(Array.from({ length: 7 }, (_, i) => event(i, `2026-11-01T${18 + i}:00:00Z`)).reverse());
    const original = [...tonight[0].events];
    const result = selectEvents(tonight, groups([event(99, '2026-10-31T18:00:00Z')]));
    assert.equal(result.title, 'Tonight');
    assert.deepEqual(result.events.map(row => row.id), [0, 1, 2, 3, 4]);
    assert.deepEqual(tonight[0].events, original);
});

test('empty tonight falls back to weekend, including empty date groups', () => {
    const weekend = [event(2, '2026-11-02T20:00:00Z'), event(1, '2026-11-01T20:00:00Z')];
    assert.deepEqual(selectEvents(groups([]), groups(weekend)), { title: 'This weekend', events: [weekend[1], weekend[0]] });
    assert.deepEqual(selectEvents([]), { title: 'This weekend', events: [] });
});

test('activity and stories are newest first, bounded, with no mutation', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ date: `2026-11-0${i + 1}T00:00:00Z` }));
    const original = [...items];
    assert.deepEqual(trimChronological(items, 'date', 3, true), [items[7], items[6], items[5]]);
    assert.equal(trimChronological(items, 'date', 5, true).length, 5);
    assert.deepEqual(items, original);
    assert.deepEqual(trimChronological([], 'date', 3), []);
});

test('section state gives loading and errors precedence over stale or empty data', () => {
    assert.equal(sectionState(true, 'error', []), 'loading');
    assert.equal(sectionState(false, 'error', [1]), 'error');
    assert.equal(sectionState(false, '', []), 'empty');
    assert.equal(sectionState(false, '', [1]), 'ready');
});
