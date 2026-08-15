import test from 'node:test';
import assert from 'node:assert/strict';
import { communityError, forumRows, mergeReplies, plainText, plainTextToHtml } from './model.js';

test('plainText produces readable native copy from canonical HTML', () => {
    assert.equal(
        plainText('<p>First &amp; second</p><blockquote>Listen &#x1F3B8;</blockquote>'),
        `First & second\nListen ${String.fromCodePoint(0x1f3b8)}`,
    );
});

test('plainTextToHtml preserves literal composer text for server sanitization', () => {
    assert.equal(plainTextToHtml('Rock < roll\n"yeah"'), 'Rock &lt; roll<br>&quot;yeah&quot;');
});

test('forumRows preserves server order while nesting children', () => {
    const forums = [
        { forum_id: 2, parent_id: 1, title: 'Child' },
        { forum_id: 1, parent_id: 0, title: 'Parent' },
        { forum_id: 3, parent_id: 0, title: 'Second room' },
    ];
    assert.deepEqual(
        forumRows(forums).map(({ forum_id, depth }) => [forum_id, depth]),
        [[1, 0], [2, 1], [3, 0]],
    );
});

test('mergeReplies deduplicates pagination and remains chronological', () => {
    const reply = (reply_id, date) => ({ reply_id, date });
    assert.deepEqual(
        mergeReplies(
            [reply(2, '2026-08-02T00:00:00Z'), reply(1, '2026-08-01T00:00:00Z')],
            [reply(2, '2026-08-02T00:00:00Z'), reply(3, '2026-08-03T00:00:00Z')],
        ).map(({ reply_id }) => reply_id),
        [1, 2, 3],
    );
});

test('communityError maps private and missing responses without leaking details', () => {
    assert.equal(communityError({ status: 403 }).kind, 'permission');
    assert.equal(communityError({ status: 404 }).kind, 'not-found');
    assert.equal(communityError(new Error('offline')).kind, 'retry');
});
