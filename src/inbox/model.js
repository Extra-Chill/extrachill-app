// Only route URLs that unambiguously identify a native resource. Slugs stay on the web.
export function notificationRoute(link) {
    try {
        const url = new URL(link);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
        const topic = url.hostname === 'community.extrachill.com' && url.pathname.match(/^\/(?:community\/)?topic\/([1-9]\d*)\/?$/);
        const event = url.hostname === 'events.extrachill.com' && url.pathname.match(/^\/(?:calendar\/)?event\/([1-9]\d*)\/?$/);
        const story = url.hostname === 'extrachill.com' && url.pathname.match(/^\/stories\/([1-9]\d*)\/?$/);
        if (story) return `/stories/${story[1]}`;
        if (topic) return `/community/topic/${topic[1]}`;
        if (event) return `/calendar/event/${event[1]}`;
        return null;
    } catch { return null; }
}
export function isUnread(notification) {
    return notification.is_read === false || notification.is_read === 0 || notification.is_read === '0';
}
export function mergeNotifications(previous, incoming) {
    const rows = new Map(previous.map(row => [row.id, row]));
    incoming.forEach(row => rows.set(row.id, row));
    return [...rows.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || Number(b.id) - Number(a.id));
}
export function shouldRefreshCount(lastFetch, now) {
    return lastFetch === null || now - lastFetch >= 60_000;
}
