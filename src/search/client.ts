import type { WPNativeClient } from 'wp-native-client';
import type { SearchResponse } from './types';
import { normalizeQuery, searchResults } from './model';

export async function searchNetwork(client: WPNativeClient, query: string) {
    const response = await client.execute<SearchResponse>('extrachill/multisite-search', {
        search_term: normalizeQuery(query),
        limit: 50,
        post_status: ['publish'],
    });
    return searchResults(response);
}
