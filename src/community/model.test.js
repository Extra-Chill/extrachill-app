import test from 'node:test';
import assert from 'node:assert/strict';
import { communityError, forumRows, mergeReplies, plainText, plainTextToHtml, topicForums, validateNewTopic } from './model.js';

test('plainText produces readable native copy from canonical HTML', () => {
    assert.equal(
        plainText('<p>First &amp; second</p><blockquote>Listen &#x1F3B8;</blockquote>'),
        `First & second\nListen ${String.fromCodePoint(0x1f3b8)}`,
    );
});

test('plainTextToHtml preserves literal composer text for server sanitization', () => {
    assert.equal(plainTextToHtml('Rock < roll\n"yeah"'), 'Rock &lt; roll<br>&quot;yeah&quot;');
});

test('new topic requires a positive forum ID, nonblank title and trimmed body', () => {
    assert.deepEqual(Object.keys(validateNewTopic(0, '  \n', '\t ')), ['forum', 'title', 'content']);
    for (const id of [-1, 1.5, NaN, Infinity]) {
        assert.equal(validateNewTopic(id, 'Title', 'Body').forum, 'Choose a room.');
    }
    assert.deepEqual(validateNewTopic(1, ' Title ', ' \nBody\n '), {});
    // No maxLength is declared by the ability schema: do not invent a limit.
    assert.deepEqual(validateNewTopic(1, 'a'.repeat(1000), 'b'.repeat(10000)), {});
});

test('topicForums excludes server-marked unavailable destinations without reordering', () => {
    const forums = [
        { forum_id: 1, status: 'open' },
        { forum_id: 2, status: 'closed' },
        { forum_id: 3, status: 'publish', accepts_topics: false },
        { forum_id: 4, status: 'publish' },
        { forum_id: 5, status: 'trash' },
        { forum_id: 6, status: 'archived' },
    ];
    assert.deepEqual(topicForums(forums).map((forum) => forum.forum_id), [1, 4]);
    assert.equal(forums.length, 6);
    assert.deepEqual(topicForums([]), []);
});

test('topic text is escaped rather than interpreted as HTML', () => {
    assert.equal(plainTextToHtml('<script>alert(\'x\')</script> & \"hi\"\r\nNext'),
        '&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt; &amp; &quot;hi&quot;<br>Next');
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
