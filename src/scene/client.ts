import type { WPNativeClient } from 'wp-native-client';
import { defaultLocation, listEvents, rememberEvents } from '../events/client';
import { recentActivity } from '../community/client';
import { selectEvents, trimChronological } from './model';

export interface SceneStory { id: number; title: string; date: string; url: string; }

export async function sceneEvents(client: WPNativeClient, eventsClient: WPNativeClient) {
    const location = await defaultLocation(client);
    const tonight = await listEvents(eventsClient, 1, 'tonight', location?.slug);
    const weekend = tonight.dates.some(group => group.events.length) ? []
        : (await listEvents(eventsClient, 1, 'this-weekend', location?.slug)).dates;
    rememberEvents([...tonight.dates, ...weekend]);
    return { ...selectEvents(tonight.dates, weekend), location };
}

export async function sceneActivity(client: WPNativeClient) {
    const result = await recentActivity(client);
    return trimChronological(result.items, 'timestamp', 5, true);
}

export async function sceneStories(client: WPNativeClient): Promise<SceneStory[] | null> {
    if (!client.describe('extrachill/list-stories')) return null;
    const result = await client.execute<{ items: SceneStory[] }>('extrachill/list-stories', { page: 1, per_page: 3 });
    return trimChronological(result.items, 'date', 3, true);
}
