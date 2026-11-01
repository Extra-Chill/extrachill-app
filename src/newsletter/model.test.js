import test from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionReducer, subscriptionState } from './model.js';

test('toggle is optimistic in both directions and locks while saving', () => {
    for (const subscribed of [true, false]) {
        const initial = subscriptionState(subscribed);
        const pending = subscriptionReducer(initial, { type: 'toggle', subscribed: !subscribed });
        assert.deepEqual(pending, { subscribed: !subscribed, previous: subscribed, pending: true, error: '' });
        assert.equal(initial.subscribed, subscribed);
        assert.equal(subscriptionReducer(pending, { type: 'toggle', subscribed }), pending);
    }
});

test('failed updates revert to the last saved value and expose an inline error', () => {
    for (const subscribed of [true, false]) {
        const pending = subscriptionReducer(subscriptionState(subscribed), { type: 'toggle', subscribed: !subscribed });
        const failed = subscriptionReducer(pending, { type: 'failed', error: 'Offline' });
        assert.deepEqual(failed, { ...subscriptionState(subscribed), error: 'Offline' });
        const retry = subscriptionReducer(failed, { type: 'toggle', subscribed: !subscribed });
        assert.equal(retry.error, '');
        assert.equal(retry.pending, true);
    }
});

test('success uses server confirmation and establishes the next rollback value', () => {
    const pending = subscriptionReducer(subscriptionState(false), { type: 'toggle', subscribed: true });
    assert.deepEqual(subscriptionReducer(pending, { type: 'saved', subscribed: false }), subscriptionState(false));
    const saved = subscriptionReducer(pending, { type: 'saved', subscribed: true });
    assert.deepEqual(saved, subscriptionState(true));
    const next = subscriptionReducer(saved, { type: 'toggle', subscribed: false });
    assert.equal(subscriptionReducer(next, { type: 'failed', error: 'Offline' }).subscribed, true);
});

test('settled state ignores unsolicited completion actions', () => {
    const state = subscriptionState(true);
    assert.equal(subscriptionReducer(state, { type: 'saved', subscribed: false }), state);
    assert.equal(subscriptionReducer(state, { type: 'failed', error: 'Offline' }), state);
});
