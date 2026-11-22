const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { shapeOrders, activePass, money, offerCard, passURL, qrMatrix, matrixPath, cacheKey, createTicketCache } = require('./model');

test('orders preserve metadata and only active, non-refunded passes have QR', () => {
    const order = { order_id: 1, event_id: 5, quantity: 3, status: 'completed', passes: ['active', 'refunded', 'cancelled', 'used'].map(status => ({ code: 'abc', status })) };
    const [shaped] = shapeOrders({ orders: [order] });
    assert.equal(shaped.quantity, 3);
    assert.deepEqual(shaped.passes.map(p => p.showQR), [true, false, false, false]);
    assert.equal(shapeOrders({ orders: [{ ...order, status: 'refunded' }] })[0].passes[0].showQR, false);
    assert.equal(activePass({ code: '', status: 'active' }), false);
    assert.deepEqual(shapeOrders(null), []);
});
test('money uses currency minor units', () => {
    assert.equal(money(1250, 'USD'), '$12.50');
    assert.equal(money(1250, 'JPY'), '¥1,250');
    assert.equal(money(1250, 'KWD'), 'KWD\u00a01.250');
});
const offer = { enabled: true, sale_open: true, currency: 'USD', price_minor: 1500, remaining: 2, url: 'https://shop.extrachill.com/' };
test('offer card supports legacy, closed, sold out, disabled and multiple ticket types', () => {
    assert.equal(offerCard({ ...offer, enabled: false }), null);
    assert.equal(offerCard(offer).rows[0].price, '$15.00');
    assert.equal(offerCard({ ...offer, ticket_types: [] }).canBuy, true);
    assert.equal(offerCard({ ...offer, sale_open: false }).canBuy, false);
    assert.equal(offerCard({ ...offer, remaining: 0 }).rows[0].availability, 'Sold out');
    assert.equal(offerCard({ ...offer, remaining: 0 }).canBuy, false);
    const card = offerCard({ ...offer, ticket_types: [{ id: 1, name: 'Early', price_minor: 1000, remaining: 0 }, { id: 2, name: 'General', price_minor: 2000, remaining: 5 }] });
    assert.equal(card.rows.length, 2);
    assert.equal(card.rows[1].availability, '5 remaining');
    assert.equal(card.canBuy, true);
});
test('cache is keyed per user and clears on identity changes and sign-out, including stale writes', async () => {
    const data = new Map();
    const cache = createTicketCache({
        getAllKeys: async () => [...data.keys()], multiRemove: async keys => keys.forEach(key => data.delete(key)),
        getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); },
    });
    assert.notEqual(cacheKey(1), cacheKey(2));
    assert.equal(cacheKey(null), null);
    await cache.setUser(1);
    await cache.save(1, { orders: [] }, 'today');
    assert.equal((await cache.load(1)).updatedAt, 'today');
    await cache.setUser(2);
    assert.equal(await cache.load(1), null);
    assert.equal(data.has(cacheKey(1)), false);
    await cache.save(1, { orders: [] }, 'stale');
    assert.equal(data.size, 0);
    await cache.save(2, { orders: [] }, 'now');
    const write = cache.save(2, { orders: [] }, 'in flight');
    const logout = cache.setUser(null);
    await Promise.all([write, logout]);
    assert.equal(data.size, 0);
    // A cold start must also remove another account's persisted passes.
    data.set(cacheKey(1), JSON.stringify({ userId: 1, payload: { orders: [] } }));
    await cache.setUser(2);
    assert.equal(data.size, 0);
    data.set(cacheKey(2), '{broken');
    assert.equal(await cache.load(2), null);
});
test('local QR has a stable known matrix and path with quiet zone', () => {
    assert.equal(passURL('a b/+'), 'https://events.extrachill.com/rsvp-verify?code=a%20b%2F%2B');
    const matrix = qrMatrix(passURL('TEST-123'));
    assert.equal(matrix.length, 33);
    assert.ok(matrix.every(row => row.length === 33));
    assert.equal(createHash('sha256').update(JSON.stringify(matrix)).digest('hex'), '34eadefbbf539b82a6dfa96b985e3617353eac463a65cc9931fcafb1dc6715a6');
    assert.deepEqual(matrix[0].slice(0, 7), Array(7).fill(true));
    assert.equal(matrixPath([[true, false], [false, true]]), 'M4,4h1v1h-1zM5,5h1v1h-1z');
});
