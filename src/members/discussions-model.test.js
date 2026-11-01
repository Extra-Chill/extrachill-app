import test from 'node:test';
import assert from 'node:assert/strict';
import { actorDestination, memberTopicsPage, supportsAuthorTopics } from './model.js';

test('activity actors prefer native member profiles, including the current member', () => {
    assert.deepEqual(actorDestination({ user_id: 42, profile_url: 'https://example.com/member' }), { kind: 'native', path: '/members/42' });
    assert.deepEqual(actorDestination({ user_id: 42, profile_url: null }), { kind: 'native', path: '/members/42' });
});

test('guest and legacy actors fall back to browser profiles or no navigation', () => {
    for (const user_id of [undefined, 0, -1, 1.5, NaN]) {
        assert.deepEqual(actorDestination({ user_id, profile_url: 'https://example.com/member' }), { kind: 'browser', url: 'https://example.com/member' });
        assert.equal(actorDestination({ user_id, profile_url: null }), null);
    }
});

test('author topics require author_id in the described input schema', () => {
    for (const ability of [undefined, {}, { input_schema: {} }, { input_schema: { properties: { forum_id: {} } } }]) {
        assert.equal(supportsAuthorTopics(ability), false);
    }
    assert.equal(supportsAuthorTopics({ input_schema: { properties: { author_id: { type: 'integer' } } } }), true);
});

test('topic paging preserves newest-first server order and stops on the final page', () => {
    const first = memberTopicsPage([], { topics: [{ topic_id: 3 }, { topic_id: 2 }], page: 1, pages: 2 });
    assert.equal(first.hasMore, true);
    const second = memberTopicsPage(first.topics, { topics: [{ topic_id: 2, title: 'Updated' }, { topic_id: 1 }], page: 2, pages: 2 });
    assert.deepEqual(second.topics, [{ topic_id: 3 }, { topic_id: 2, title: 'Updated' }, { topic_id: 1 }]);
    assert.equal(second.page, 2);
    assert.equal(second.hasMore, false);
    assert.deepEqual(first.topics, [{ topic_id: 3 }, { topic_id: 2 }]);
});

test('empty topics hide naturally and refresh replaces previously loaded pages', () => {
    assert.deepEqual(memberTopicsPage([], { topics: [], page: 1, pages: 0 }), { topics: [], page: 1, hasMore: false });
    assert.deepEqual(memberTopicsPage([], { topics: [{ topic_id: 4 }], page: 1, pages: 1 }).topics, [{ topic_id: 4 }]);
});
