import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from 'wp-native-shell';
import { siteClientEntry } from './model';

export function useSiteClient(root: string) {
    const { client: base } = useAuth();
    const entry = siteClientEntry(base, root);
    const state = useSyncExternalStore(entry.subscribe, entry.getSnapshot, entry.getSnapshot);
    useEffect(() => {
        // Failed entries stay failed until explicitly retried, including across navigation.
        if (!entry.getSnapshot().error) void entry.discover();
    }, [entry]);
    return { client: entry.client, ...state, retry: () => { void entry.discover(); } };
}
