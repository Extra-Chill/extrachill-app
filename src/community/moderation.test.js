const { test } = require('node:test');
const assert = require('node:assert/strict');
const { REPORT_REASONS, buildReportInput, reportMessage } = require('./moderation.js');

test('report reasons match the server and have readable labels', () => {
    assert.deepEqual(REPORT_REASONS.map(({ value }) => value), ['spam', 'harassment', 'hate', 'sexual', 'other']);
    assert.ok(REPORT_REASONS.every(({ label }) => label.length > 0));
});
test('builds exactly one target and trims optional notes', () => {
    assert.deepEqual(buildReportInput({ post_id: 12 }, 'spam', '  context  '), { post_id: 12, reason: 'spam', note: 'context' });
    assert.deepEqual(buildReportInput({ user_id: 8 }, 'other', ' '), { user_id: 8, reason: 'other' });
    assert.equal(buildReportInput({ post_id: 1 }, 'hate', 'a'.repeat(1000)).note.length, 1000);
});
test('rejects missing, ambiguous, and invalid targets', () => {
    for (const target of [{}, { post_id: 1, user_id: 2 }, { post_id: 0 }, { user_id: -1 }, { post_id: 1.5 }, { user_id: '2' }, { post_id: null }]) {
        assert.throws(() => buildReportInput(target, 'spam'));
    }
});
test('rejects unsupported reasons and overlong notes', () => {
    assert.throws(() => buildReportInput({ post_id: 1 }, 'invalid'));
    assert.throws(() => buildReportInput({ user_id: 1 }, 'other', 'a'.repeat(1001)));
});
test('maps success, duplicate, rate-limit, and errors to private calm messages', () => {
    assert.equal(reportMessage({ deduplicated: false }), 'Thanks, a moderator will take a look.');
    assert.match(reportMessage({ deduplicated: true }), /already reported/);
    assert.match(reportMessage(null, { status: 429 }), /try again later/);
    assert.match(reportMessage(null, { data: { status: 429 } }), /try again later/);
    assert.match(reportMessage(null, new Error('private server detail')), /could not be sent/);
});
