import type { WPNativeClient } from 'wp-native-client';
export type Ratings = Record<number, number>;
export async function getShowRatings(client: WPNativeClient, eventIds: number[]): Promise<Ratings> {
    const ids = [...new Set(eventIds)];
    const ratings: Ratings = {};
    for (let i = 0; i < ids.length; i += 100) {
        const result = await client.execute<{ ratings: Ratings }>('extrachill/get-my-show-ratings', { event_ids: ids.slice(i, i + 100) });
        Object.assign(ratings, result.ratings);
    }
    return ratings;
}
export function rateShow(client: WPNativeClient, eventId: number, rating: number) {
    return client.execute<{ event_id: number; rating: number }>('extrachill/rate-show', { event_id: eventId, rating });
}
