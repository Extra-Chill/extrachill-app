const scopes = [
    { label: 'Tonight', value: 'tonight' },
    { label: 'This weekend', value: 'this-weekend' },
    { label: 'This week', value: 'this-week' },
    { label: 'Upcoming', value: 'upcoming' },
];
function mergeDates(current, incoming) {
    const dates = new Map();
    for (const group of [...current, ...incoming]) {
        const previous = dates.get(group.date);
        const events = new Map((previous?.events || []).map(event => [event.id, event]));
        for (const event of group.events) events.set(event.id, event);
        dates.set(group.date, { ...group, events: [...events.values()].sort((a, b) => a.datetime.localeCompare(b.datetime) || a.id - b.id) });
    }
    return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date));
}
// Server datetime is a venue-local wall clock: never parse it in the device timezone.
function eventTime(event) {
    const time = event.occurrence_display?.formatted_time_display || event.datetime.replace('T', ' ');
    return [time, event.venue?.timezone].filter(Boolean).join(' · ');
}
function validEventId(value) {
    return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}
function safeLink(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
}
module.exports = { scopes, mergeDates, eventTime, validEventId, safeLink };
