const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canRateShow, toggleRating, recentShows } = require('./model');

test('only server-confirmed past and attended shows are eligible', () => {
    assert.equal(canRateShow('past', true), true);
    for (const timing of ['upcoming', 'ongoing', undefined, '']) assert.equal(canRateShow(timing, true), false);
    assert.equal(canRateShow('past', false), false);
});
test('stars set, change and clear a rating', () => {
    for (let star = 1; star <= 5; star++) {
        assert.equal(toggleRating(0, star), star);
        assert.equal(toggleRating(star, star), 0);
    }
    assert.equal(toggleRating(2, 5), 5);
    for (const invalid of [0, 6, -1, 1.5, '3', NaN]) assert.throws(() => toggleRating(0, invalid), RangeError);
});
test('recent shows are unrated first and newest first, without mutating history', () => {
    const shows = [{ event_id: 1, event_date: '2026-01-01' }, { event_id: 2, event_date: '2026-03-01' }, { event_id: 3, event_date: '2026-02-01' }];
    assert.deepEqual(recentShows(shows, { 2: 5 }).map(s => s.event_id), [3, 1, 2]);
    assert.deepEqual(shows.map(s => s.event_id), [1, 2, 3]);
    assert.deepEqual(recentShows(shows, { 2: 0 }).map(s => s.event_id), [2, 3, 1]);
});
