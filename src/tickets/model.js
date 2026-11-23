const qrcode = require('qrcode-generator');

function activePass(pass) { return pass?.status === 'active' && typeof pass.code === 'string' && pass.code.length > 0; }
function shapeOrders(payload) {
    return (Array.isArray(payload?.orders) ? payload.orders : []).map(order => ({
        ...order,
        passes: (Array.isArray(order.passes) ? order.passes : []).map(pass => ({
            ...pass, showQR: activePass(pass) && !['cancelled', 'refunded'].includes(order.status),
        })),
    }));
}
function money(minor, currency = 'USD') {
    try {
        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
        const digits = formatter.resolvedOptions().maximumFractionDigits;
        return formatter.format(Number(minor) / 10 ** digits);
    } catch { return `${minor} ${currency}`; }
}
function offerCard(offer) {
    if (!offer?.enabled) return null;
    const types = offer.ticket_types?.length ? offer.ticket_types : [{ id: 'legacy', name: 'Admission', price_minor: offer.price_minor, remaining: offer.remaining }];
    const rows = types.map(type => ({
        id: String(type.id), name: type.name, price: money(type.price_minor, offer.currency),
        availability: type.remaining == null ? 'Availability at checkout' : Number(type.remaining) <= 0 ? 'Sold out' : `${type.remaining} remaining`,
    }));
    return { rows, saleOpen: Boolean(offer.sale_open), canBuy: Boolean(offer.sale_open) && types.some(type => type.remaining == null || Number(type.remaining) > 0), url: offer.url };
}
function passURL(code) { return `https://events.extrachill.com/rsvp-verify?code=${encodeURIComponent(code)}`; }
function qrMatrix(value) {
    const qr = qrcode(0, 'M');
    qr.addData(value, 'Byte'); qr.make();
    return Array.from({ length: qr.getModuleCount() }, (_, y) => Array.from({ length: qr.getModuleCount() }, (_, x) => qr.isDark(y, x)));
}
function matrixPath(matrix, quiet = 4) {
    return matrix.flatMap((row, y) => row.map((dark, x) => dark ? `M${x + quiet},${y + quiet}h1v1h-1z` : '')).join('');
}
const CACHE_PREFIX = 'tickets:v1:';
function cacheKey(userId) { return userId ? `${CACHE_PREFIX}${userId}` : null; }
// Serialize identity changes and writes so an old request can never resurrect a signed-out user's passes.
function createTicketCache(storage) {
    let user = null;
    let queue = Promise.resolve();
    const enqueue = action => { const next = queue.then(action); queue = next.catch(() => {}); return next; };
    return {
        setUser(id) {
            user = id || null;
            return enqueue(async () => {
                const keep = cacheKey(user);
                const keys = (await storage.getAllKeys()).filter(key => key.startsWith(CACHE_PREFIX) && key !== keep);
                if (keys.length) await storage.multiRemove(keys);
            });
        },
        load(id) { return enqueue(async () => {
            if (id !== user) return null;
            const raw = await storage.getItem(cacheKey(id));
            try { const value = JSON.parse(raw); return value?.userId === id && Array.isArray(value.payload?.orders) ? value : null; } catch { return null; }
        }); },
        save(id, payload, updatedAt) { return enqueue(async () => {
            if (id !== user || !id) return;
            await storage.setItem(cacheKey(id), JSON.stringify({ userId: id, payload, updatedAt }));
        }); },
    };
}
module.exports = { activePass, shapeOrders, money, offerCard, passURL, qrMatrix, matrixPath, cacheKey, createTicketCache };
