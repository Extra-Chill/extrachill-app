const { test } = require('node:test');
const assert = require('node:assert/strict');
const { venueIdentifier, venueAddress, directionsUrl, marketCoordinates, browseVenues } = require('./model');

test('venue links prefer term ID, then slug, then name; missing identifiers are not links', () => {
    assert.equal(venueIdentifier({ term_id: 12, slug: 'hall', name: 'Hall' }), '12');
    assert.equal(venueIdentifier({ term_id: 0, slug: 'hall', name: 'Hall' }), 'hall');
    assert.equal(venueIdentifier({ name: ' Hall & Bar ' }), 'Hall & Bar');
    for (const value of [null, undefined, {}, { name: '  ' }]) assert.equal(venueIdentifier(value), null);
});
test('address and directions omit missing fields and encode map queries', () => {
    const venue = { name: 'Hall & Bar', address: '1 Main St', city: 'Austin', state: 'TX' };
    assert.equal(venueAddress(venue), '1 Main St, Austin, TX');
    assert.equal(directionsUrl(venue, 'ios'), 'https://maps.apple.com/?q=1%20Main%20St%2C%20Austin%2C%20TX');
    assert.equal(directionsUrl({ name: 'Hall & Bar' }, 'android'), 'https://www.google.com/maps/search/?api=1&query=Hall%20%26%20Bar');
});
test('market coordinates allow zero and reject incomplete, out of range and nonnumeric values', () => {
    assert.deepEqual(marketCoordinates({ lat: 0, lng: 0 }), { lat: 0, lng: 0 });
    assert.deepEqual(marketCoordinates({ latitude: 30, longitude: -97 }), { lat: 30, lng: -97 });
    for (const value of [null, {}, { lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: NaN, lng: 1 }, { lat: '30', lng: -97 }]) assert.equal(marketCoordinates(value), null);
});
test('browse searches names and addresses, sorts alphabetically or by distance, never by event count', () => {
    const venues = [
        { term_id: 1, name: 'Zoo', address: 'Austin', event_count: 100, distance: 1 },
        { term_id: 2, name: 'Alpha', address: 'Dallas', event_count: 0, distance: 3 },
        { term_id: 3, name: 'Beta', address: 'Austin' },
    ];
    assert.deepEqual(browseVenues(venues).map(v => v.term_id), [2, 3, 1]);
    assert.deepEqual(browseVenues(venues, '', true).map(v => v.term_id), [1, 2, 3]);
    assert.deepEqual(browseVenues(venues, ' AUSTIN ').map(v => v.term_id), [3, 1]);
    assert.deepEqual(browseVenues(venues, 'alpha').map(v => v.term_id), [2]);
    assert.deepEqual(browseVenues(venues, 'missing'), []);
    assert.equal(venues[0].term_id, 1);
});
