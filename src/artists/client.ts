import type { WPNativeClient } from 'wp-native-client';

export const ARTIST_REST_ROOT = 'https://artist.extrachill.com/wp-json/';
export interface ArtistMembership { id: number; name: string; slug: string; profile_image_url: string | null }
export interface Artist extends ArtistMembership {
    permalink: string; bio: string; local_city: string | null; genres: string[]; genre_labels: string[];
    profile_image_id: number | null; header_image_id: number | null; header_image_url: string | null;
    official_links: unknown[]; link_page_id: number | null;
}
// The link-page abilities expose extensible objects. Normalize their display fields in model.js.
export type LinkPageData = Record<string, unknown>;
export interface Analytics { summary: Record<string, unknown>; chart_data: Record<string, unknown>; top_links: unknown[] }
export const getUserArtists = (client: WPNativeClient, userId: number) => client.execute<ArtistMembership[]>('extrachill/get-user-artists', { user_id: userId });
export const getArtist = (client: WPNativeClient, id: number) => client.execute<Artist>('extrachill/artist-get', { id });
export const getLinkPageData = (client: WPNativeClient, artistId: number) => client.execute<LinkPageData>('extrachill/get-link-page-data', { artist_id: artistId });
export const getLinkPageAnalytics = (client: WPNativeClient, linkPageId: number) => client.execute<Analytics>('extrachill/get-link-page-analytics', { link_page_id: linkPageId, date_range: 30 });
export const getArtistAnalytics = (client: WPNativeClient, id: number) => client.execute<Analytics>('extrachill/artist-get-analytics', { id, date_range: 30 });
