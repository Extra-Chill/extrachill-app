import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanExcerpt, displayDate, mergeStories, storyError, readerDocument, storySource, storyRouteParams } from './model.js';

test('selects only known sources and falls back to the story site host', () => {
    assert.equal(storySource(), 'main');
    assert.equal(storySource('wire'), 'wire');
    assert.equal(storySource('main', 'wire.extrachill.com'), 'main');
    assert.equal(storySource(undefined, 'wire.extrachill.com'), 'wire');
    assert.equal(storySource('unknown', 'WIRE.EXTRACHILL.COM'), 'wire');
    assert.equal(storySource('https://evil.example', 'wire.extrachill.com.evil.example'), 'main');
    assert.equal(storySource(undefined, 'extrachill.com'), 'main');
});
test('parses repeated route params deterministically and tolerates empty values', () => {
    assert.equal(storySource(['wire', 'main']), 'wire');
    assert.equal(storySource(['main', 'wire']), 'main');
    assert.equal(storySource([], ['wire.extrachill.com']), 'wire');
    assert.equal(storySource('', ''), 'main');
});
test('story routes carry the source and host, including when ids overlap across sites', () => {
    const item = { id: 42, site: { host: 'wire.extrachill.com' } };
    assert.deepEqual(storyRouteParams(item), { storyId: '42', source: 'wire', host: 'wire.extrachill.com' });
    assert.equal(storyRouteParams(item, 'main').source, 'main');
    const route = storyRouteParams(item, 'wire');
    assert.equal(storySource(route.source, route.host), 'wire');
    assert.equal(storySource(undefined, route.host), 'wire');
});

test('cleans markup, entities and whitespace from excerpts', () => {
    assert.equal(cleanExcerpt('<p>A &amp; B&nbsp; &#x1f3b8;</p>\n<p>More</p>'), 'A & B 🎸 More');
    assert.equal(cleanExcerpt(''), '');
});
test('formats dates in UTC and tolerates missing or invalid dates', () => {
    assert.equal(displayDate('2026-01-02T00:00:00Z'), 'Jan 2, 2026');
    assert.equal(displayDate('invalid'), '');
    assert.equal(displayDate(''), '');
});
test('merges pages newest first, replaces duplicate ids, and leaves inputs intact', () => {
    const old = { id: 1, date: '2026-01-01T00:00:00Z', title: 'Old' };
    const updated = { ...old, title: 'Updated' };
    const newer = { id: 2, date: '2026-01-02T00:00:00Z' };
    const tied = { id: 3, date: newer.date };
    assert.deepEqual(mergeStories([old], [updated, newer, tied]), [tied, newer, updated]);
    assert.equal(old.title, 'Old');
    assert.deepEqual(mergeStories([], []), []);
});
test('missing stories have a specific reader state', () => {
    assert.match(storyError({ code: 'story_not_found' }), /no longer available/);
    assert.match(storyError(new Error()), /try again/);
});
test('reader document blocks scripts, forms and frames with CSP and uses theme colors', () => {
    const html = readerDocument('<p>Story</p>', { background: '#111', text: '#eee', primary: '#abc' });
    assert.match(html, /default-src 'none'/);
    assert.match(html, /form-action 'none'/);
    assert.match(html, /frame-src 'none'/);
    assert.match(html, /background:#111/);
    assert.match(html, /<p>Story<\/p>/);
});
