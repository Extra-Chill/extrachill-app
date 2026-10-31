export interface Venue { term_id: number; name: string; slug?: string; description?: string; address?: string; city?: string; state?: string; zip?: string; country?: string; website?: string; timezone?: string; }
export interface VenueSummary extends Venue { lat?: number; lon?: number; distance?: number; url?: string; event_count?: number; }
export function venueIdentifier(venue: { term_id?: number; name?: string; slug?: string } | null | undefined): string | null;
export function venueAddress(venue: Venue): string;
export function directionsUrl(venue: Venue, platform: string): string;
export function marketCoordinates(market: unknown): { lat: number; lng: number } | null;
export function browseVenues(venues: VenueSummary[], search?: string, proximity?: boolean): VenueSummary[];
