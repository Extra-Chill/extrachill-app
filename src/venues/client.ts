import type { WPNativeClient } from 'wp-native-client';
import { rememberEvents } from '../events/client';
import { validEventId } from '../events/model';
import type { DateGroup } from '../events/model';
import type { Venue, VenueSummary } from './model';

export function getVenue(client: WPNativeClient, id: number) {
    return client.execute<Venue & { error?: string }>('data-machine-events/get-venue', { id });
}
// Resolves a name/slug link to a term ID. Only used when an event payload lacks the venue ID.
function resolveVenueId(client: WPNativeClient, venue: string) {
    return client.execute<{ venue?: { term_id: number } }>('data-machine-events/get-venue-events', { venue, status: 'publish', limit: 1 });
}
export async function loadVenue(client: WPNativeClient, identifier: string) {
    const id = validEventId(identifier) ? Number(identifier) : (await resolveVenueId(client, identifier)).venue?.term_id;
    if (!validEventId(id)) throw new Error('Venue not found');
    const venue = await getVenue(client, Number(id));
    if (venue.error || !venue.slug) throw new Error(venue.error || 'Venue not found');
    return venue;
}
// Same public calendar the Calendar tab uses: upcoming only, chronological, paginated.
// `venue_id` is reserved for authorized venue managers, so filter by slug.
export async function listVenueShows(client: WPNativeClient, slug: string, page: number) {
    const result = await client.execute<{ dates: DateGroup[]; page: number; has_more: boolean; total: number }>(
        'extrachill/events-calendar', { venue: slug, page, past: false },
    );
    rememberEvents(result.dates);
    return result;
}
export function listVenues(client: WPNativeClient, coordinates: { lat: number; lng: number } | null) {
    return client.execute<{ venues: VenueSummary[]; total: number }>('data-machine-events/list-venues', coordinates ? { ...coordinates, radius: 25, radius_unit: 'mi' } : {});
}
