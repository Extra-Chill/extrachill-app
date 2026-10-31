function canRateShow(timing, attended) {
    return timing === 'past' && attended === true;
}
function toggleRating(current, star) {
    if (!Number.isInteger(star) || star < 1 || star > 5) throw new RangeError('Choose 1–5 stars.');
    return current === star ? 0 : star;
}
function recentShows(shows, ratings) {
    return [...shows].sort((a, b) => Boolean(ratings[a.event_id]) - Boolean(ratings[b.event_id]) || b.event_date.localeCompare(a.event_date) || b.event_id - a.event_id);
}
module.exports = { canRateShow, toggleRating, recentShows };
