const assert = require('node:assert/strict');
const test = require('node:test');
const {
    findPendingActions,
    isTerminalRunStatus,
    normalizeMessages,
    pendingPreviewText,
    textFromContent,
} = require('./normalize');

test('normalizes canonical string and content-part messages', () => {
    assert.deepEqual(
        normalizeMessages([
            { id: 'one', role: 'user', content: 'Hello' },
            { role: 'assistant', content: [{ type: 'text', text: 'Hi' }, { type: 'text', text: 'there' }] },
            { role: 'user', type: 'tool_result', content: 'Internal result' },
            { role: 'tool', content: { ignored: true } },
        ]),
        [
            { id: 'one', role: 'user', text: 'Hello' },
            { id: 'assistant-1', role: 'assistant', text: 'Hi\nthere' },
            { id: 'tool-2', role: 'tool', text: 'Internal result' },
        ],
    );
    assert.equal(textFromContent(null), '');
});

test('finds generic pending actions and preserves opaque origin', () => {
    const workspace = { workspace_type: 'network', workspace_id: '1' };
    const metadata = { datamachine: { context: { wordpress: { blog_id: 7 } } } };
    const actions = findPendingActions({
        workspace,
        metadata,
        payload: {
            type: 'approval_required',
            action_id: 'action-1',
            summary: 'Review this change',
        },
    });

    assert.equal(actions.length, 1);
    assert.equal(actions[0].action_id, 'action-1');
    assert.deepEqual(actions[0].origin, { workspace, metadata });

    assert.equal(findPendingActions({ action_id: 'done', status: 'accepted' }).length, 0);
    assert.equal(findPendingActions({ metadata: { action_id: 'unrelated', status: 'pending' } }).length, 0);
});

test('recognizes terminal and active run states', () => {
    assert.equal(isTerminalRunStatus('completed'), true);
    assert.equal(isTerminalRunStatus('approval_required'), true);
    assert.equal(isTerminalRunStatus('runtime_tool_pending'), false);
    assert.equal(isTerminalRunStatus('running'), false);
});

test('requires a visible pending-action preview', () => {
    assert.equal(pendingPreviewText(''), '');
    assert.equal(pendingPreviewText(undefined), '');
    assert.equal(pendingPreviewText({ title: 'Changed title' }), '{\n  "title": "Changed title"\n}');
});
