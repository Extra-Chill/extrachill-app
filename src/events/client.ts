import type { WPNativeClient } from 'wp-native-client';
import type { CalendarEvent, DateGroup, EventLocation, TimeScope } from './model';

export const EVENTS_REST_ROOT = 'https://events.extrachill.com/wp-json/';
export function listEvents(client: WPNativeClient, page: number, scope: TimeScope, location = '') {
    return client.execute<{ dates: DateGroup[]; page: number; has_more: boolean; total: number }>(
        'extrachill/events-calendar',
        { page, past: false, ...(scope !== 'upcoming' ? { scope } : {}), ...(location ? { location } : {}) },
    );
}
export async function defaultLocation(client: WPNativeClient): Promise<EventLocation | null> {
    const settings = await client.execute<{ default_event_location: EventLocation | null }>('extrachill/get-user-settings', {});
    if (!settings.default_event_location?.slug) return null;
    const result = await client.execute<{ location: EventLocation | null }>('extrachill/user-event-locations', { mode: 'resolve', slug: settings.default_event_location.slug });
    return result.location;
}
export function searchLocations(client: WPNativeClient, search: string) {
    return client.execute<{ locations: EventLocation[] }>('extrachill/events-locations', { mode: 'search', search, limit: 20 });
}
export function getEvent(client: WPNativeClient, id: number): Promise<CalendarEvent> {
    return client.execute<CalendarEvent>('data-machine-events/get-event', { event_id: id });
}
export function getAttendance(client: WPNativeClient, eventId: number) {
    return client.execute<{ count: number; user_marked: boolean; timing: string }>('extrachill/get-event-attendance', { event_id: eventId, include_attendees: false });
}
export function toggleGoing(client: WPNativeClient, eventId: number) {
    return client.execute<{ count: number; marked: boolean; timing: string }>('extrachill/toggle-event-mark', { event_id: eventId });
}
// Keep the actual server payload, not a reconstructed event in URL parameters.
const events = new Map<number, CalendarEvent>();
export function rememberEvents(groups: DateGroup[]) {
    for (const group of groups) for (const event of group.events) events.set(event.id, event);
}
export function cachedEvent(id: number) { return events.get(id); }
