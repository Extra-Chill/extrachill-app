// Home is bounded and chronological; never rank by engagement.
export function trimChronological(items, dateKey, limit, newestFirst = false) {
    return [...items].sort((a, b) => {
        const difference = Date.parse(a[dateKey]) - Date.parse(b[dateKey]);
        return (Number.isNaN(difference) ? 0 : difference) * (newestFirst ? -1 : 1);
    }).slice(0, limit);
}

export function selectEvents(tonight, weekend = []) {
    const events = tonight.flatMap(group => group.events);
    const fallback = events.length === 0;
    return {
        title: fallback ? 'This weekend' : 'Tonight',
        // Event datetimes are venue-local wall clocks, not device-local instants.
        events: [...(fallback ? weekend.flatMap(group => group.events) : events)]
            .sort((a, b) => a.datetime.localeCompare(b.datetime) || a.id - b.id).slice(0, 5),
    };
}

export function sectionState(loading, error, items) {
    if (loading) return 'loading';
    if (error) return 'error';
    return items.length ? 'ready' : 'empty';
}
