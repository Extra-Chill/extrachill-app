const assert = require('node:assert/strict');
const test = require('node:test');
const { assertFontFamiliesRegistered, getFontLoadState } = require('./font-contract');

test('configured font families resolve to registered font names', () => {
    assert.doesNotThrow(() => {
        assertFontFamiliesRegistered(
            { Helvetica: 1, WilcoLoftSans: 2 },
            { regular: 'WilcoLoftSans' },
        );
    });
});

test('an unregistered configured weight fails deterministically', () => {
    assert.throws(
        () => {
            assertFontFamiliesRegistered(
                { WilcoLoftSans: 1 },
                { regular: 'WilcoLoftSans', bold: 'WilcoLoftSans-Bold' },
            );
        },
        /Configured bold font family "WilcoLoftSans-Bold" is not registered/,
    );
});

test('font loading waits, renders registered fonts, and falls back on error', () => {
    assert.equal(getFontLoadState(false, null), 'loading');
    assert.equal(getFontLoadState(true, null), 'ready');
    assert.equal(getFontLoadState(false, new Error('load failed')), 'fallback');
});
