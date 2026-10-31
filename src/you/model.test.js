import test from 'node:test';
import assert from 'node:assert/strict';
import { deletionConfirmed, mergeShows, passwordError, safeLinks, youError } from './model.js';

test('profile links permit only web URLs', () => {
    assert.deepEqual(safeLinks(null), []);
    assert.deepEqual(safeLinks([null, {}, { url: 'javascript:alert(1)' }, { url: '/relative' }, { url: 'https://example.com', label: 'Site' }]), [{ url: 'https://example.com', label: 'Site' }]);
});
test('pagination deduplicates and retains chronological server order', () => {
    const first = { event_id: 3, title: 'Old' };
    const replacement = { event_id: 3, title: 'Updated' };
    assert.deepEqual(mergeShows([first, { event_id: 1 }], [replacement, { event_id: 2 }]), [replacement, { event_id: 1 }, { event_id: 2 }]);
    assert.deepEqual(mergeShows([], []), []);
});
test('password validation requires current, minimum length, and matching confirmation', () => {
    assert.match(passwordError('', '12345678', '12345678'), /current/);
    assert.match(passwordError('old', 'short', 'short'), /8/);
    assert.match(passwordError('old', '12345678', '87654321'), /match/);
    assert.equal(passwordError('old', '12345678', '12345678'), '');
    assert.notEqual(passwordError('old', '12345678 ', '12345678'), '');
});
test('deletion requires capability and exact typed confirmation', () => {
    assert.equal(deletionConfirmed(false, 'DELETE'), false);
    for (const value of ['', 'delete', ' DELETE', 'DELETE ']) assert.equal(deletionConfirmed(true, value), false);
    assert.equal(deletionConfirmed(true, 'DELETE'), true);
});
test('errors have actionable fallback text', () => {
    assert.equal(youError(new Error('Offline')), 'Offline');
    assert.match(youError(null), /Try again/);
});
