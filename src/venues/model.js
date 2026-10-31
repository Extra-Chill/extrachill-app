const { validEventId } = require('../events/model');
function venueIdentifier(venue) {
    if (validEventId(venue?.term_id)) return String(venue.term_id);
    return venue?.slug?.trim() || venue?.name?.trim() || null;
}
function venueAddress(venue) {
    return [venue.address, venue.city, venue.state, venue.zip, venue.country].filter(Boolean).join(', ');
}
function directionsUrl(venue, platform) {
    const query = venueAddress(venue) || venue.name;
    return platform === 'ios' ? `https://maps.apple.com/?q=${encodeURIComponent(query)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
function marketCoordinates(market) {
    const lat = market?.lat ?? market?.latitude;
    const lng = market?.lng ?? market?.longitude;
    return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
function browseVenues(venues, search = '', proximity = false) {
    const query = search.trim().toLocaleLowerCase();
    return venues.filter(venue => validEventId(venue.term_id) && `${venue.name} ${venue.address || ''}`.toLocaleLowerCase().includes(query))
        .sort((a, b) => (proximity ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : 0) || a.name.localeCompare(b.name) || a.term_id - b.term_id);
}
module.exports = { venueIdentifier, venueAddress, directionsUrl, marketCoordinates, browseVenues };
