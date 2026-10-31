import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsSummary, artistId, linkPageLinks, linkPageUrl, manageArtistUrl } from './model.js';

test('route IDs must be positive safe integers, not arrays or coerced values', () => {
    assert.equal(artistId('42'), 42);
    for (const value of ['', '0', '-1', '1.5', '1e2', ' 2', ['2'], undefined, '9007199254740992']) assert.equal(artistId(value), null);
});
test('link page URLs use the path-based extrachill.link contract', () => {
    assert.equal(linkPageUrl('my-band'), 'https://extrachill.link/my-band');
    assert.equal(linkPageUrl('a/b?x=1'), 'https://extrachill.link/a%2Fb%3Fx%3D1');
    assert.equal(linkPageUrl(null), '');
    assert.equal(manageArtistUrl(12), 'https://artist.extrachill.com/manage-artist/?artist_id=12');
});
test('sectioned links preserve editor order, decode labels and reject unsafe URLs', () => {
    assert.deepEqual(linkPageLinks({ link_sections: [
        { links: [{ link_text: '<b>Music &amp; more</b>', link_url: 'https://example.com/music' }, null, { link_url: 'javascript:alert(1)' }] },
        { links: [{ link_url: 'http://example.com/tour' }, { link_url: '/relative' }] },
    ] }), [{ label: 'Music & more', url: 'https://example.com/music' }, { label: 'http://example.com/tour', url: 'http://example.com/tour' }]);
});
test('legacy flat links and empty/malformed payloads', () => {
    assert.deepEqual(linkPageLinks({ links: [{ link_text: 'Listen', link_url: 'https://example.com' }] }), [{ label: 'Listen', url: 'https://example.com' }]);
    for (const value of [null, {}, { links: 'bad' }, { links: [null, {}] }]) assert.deepEqual(linkPageLinks(value), []);
});
test('analytics show real zeroes, not fabricated counts, and list links alphabetically rather than by popularity', () => {
    assert.deepEqual(analyticsSummary({ summary: { total_views: '25', total_clicks: 0 }, top_links: [
        { text: 'Z music', clicks: '9' }, { text: 'A tour', clicks: 2 }, null,
    ] }), { views: 25, clicks: 0, links: [{ label: 'A tour', clicks: 2 }, { label: 'Z music', clicks: 9 }] });
    assert.deepEqual(analyticsSummary(null), { views: null, clicks: null, links: [] });
    assert.deepEqual(analyticsSummary({ summary: { total_views: -2, total_clicks: 'bad' }, top_links: [{ identifier: 'https://example.com', clicks: null }] }), {
        views: null, clicks: null, links: [{ label: 'https://example.com', clicks: null }],
    });
});
