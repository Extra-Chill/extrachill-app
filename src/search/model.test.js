import test from 'node:test';
import assert from 'node:assert/strict';
import { groupResults, normalizeQuery, rememberQuery, resultDestination, searchResults } from './model.js';

const topic = { ID: 42, post_type: 'topic', site_url: 'community.extrachill.com', permalink: 'https://community.extrachill.com/t/example/' };

test('community topics use the native topic contract', () => {
    assert.deepEqual(resultDestination(topic), { kind: 'native', path: '/community/topic/42' });
    assert.equal(resultDestination({ ...topic, site_url: 'https://community.extrachill.com/' }).kind, 'native');
    assert.equal(resultDestination({ ...topic, site_url: undefined }).kind, 'native');
});

test('events use the Calendar route contract', () => {
    for (const post_type of ['event', 'tribe_events']) {
        assert.deepEqual(resultDestination({ ID: 7, post_type }), { kind: 'native', path: '/calendar/event/7' });
    }
});

test('other types, non-community topics, and invalid IDs use browser handoff', () => {
    for (const changes of [{ post_type: 'post' }, { post_type: 'venue' }, { post_type: 'artist' }, { site_url: 'extrachill.com' }, { ID: -1 }, { ID: 1.5 }]) {
        assert.deepEqual(resultDestination({ ...topic, ...changes }), { kind: 'browser', url: topic.permalink });
    }
});

test('missing and unsafe permalinks are not actionable', () => {
    for (const permalink of [undefined, '', 'bad url', 'javascript:alert(1)', 'file:///tmp/test']) {
        assert.deepEqual(resultDestination({ post_type: 'post', permalink }), { kind: 'unavailable' });
    }
});

test('grouping retains first-seen group order and server relevance order', () => {
    const results = [
        { ID: 9, site_url: 'a', site_name: 'Stories', _search_score: 1 },
        { ID: 2, site_url: 'b', site_name: 'Community' },
        { ID: 1, site_url: 'a', site_name: 'Stories', _search_score: 100 },
    ];
    const groups = groupResults(results);
    assert.deepEqual(groups.map((group) => group.key), ['a', 'b']);
    assert.deepEqual(groups[0].results.map((result) => result.ID), [9, 1]);
    assert.deepEqual(results.map((result) => result.ID), [9, 2, 1]);
    assert.deepEqual(groupResults([]), []);
    assert.equal(groupResults([{ post_type: 'artist' }])[0].title, 'artist');
});

test('both ability response shapes are supported', () => {
    assert.deepEqual(searchResults([topic]), [topic]);
    assert.deepEqual(searchResults({ results: [topic], total: 1 }), [topic]);
});

test('recent queries are normalized, deduplicated, bounded, and immutable', () => {
    assert.equal(normalizeQuery('  live   music  '), 'live music');
    const previous = ['Live music', 'venues'];
    assert.deepEqual(rememberQuery(previous, ' live music '), ['live music', 'venues']);
    assert.deepEqual(previous, ['Live music', 'venues']);
    assert.deepEqual(rememberQuery(previous, 'x'), previous);
    assert.equal(rememberQuery(['aa', 'bb', 'cc', 'dd', 'ee'], 'ff').length, 5);
});
