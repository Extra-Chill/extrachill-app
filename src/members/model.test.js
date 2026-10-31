import test from 'node:test';
import assert from 'node:assert/strict';
import { memberId, memberRoute, mergeMembers, membersPage } from './model.js';

test('member IDs reject malformed and unsafe routes', () => {
    for (const value of [null, undefined, true, '', ' 1', '1.5', '1e2', '-1', 0, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(memberId(value), null);
    assert.equal(memberId('42'), 42);
    assert.equal(memberRoute('42', 42), '/you');
    assert.equal(memberRoute(43, 42), '/members/43');
    assert.equal(memberRoute('bad'), null);
});
test('overlapping pages preserve server alphabetical order and replace duplicates', () => {
    const current = [{ user_id: 4, display_name: 'Alice' }, { user_id: 2, display_name: 'Bob' }];
    assert.deepEqual(mergeMembers(current, [{ user_id: 2, display_name: 'Bobby' }, { user_id: 9, display_name: 'Charlie' }, { user_id: 0 }]), [current[0], { user_id: 2, display_name: 'Bobby' }, { user_id: 9, display_name: 'Charlie' }]);
});
test('directory uses nested server pagination including empty final page', () => {
    assert.equal(membersPage({ members: [], pagination: { total_pages: 0 } }, 1, 25).hasMore, false);
    assert.equal(membersPage({ members: [], pagination: { total_pages: 3 } }, 2, 25).hasMore, true);
    assert.equal(membersPage({ members: [], pagination: { total_pages: 3 } }, 3, 25).hasMore, false);
    assert.deepEqual(membersPage({}, 1, 25), { members: [], page: 1, hasMore: false });
});
