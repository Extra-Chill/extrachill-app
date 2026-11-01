import type { WPNativeClient } from 'wp-native-client';
export interface SiteClientEntry {
    client: WPNativeClient;
    getSnapshot(): { ready: boolean; error?: Error };
    subscribe(listener: () => void): () => void;
    discover(): Promise<void>;
}
export function siteClientEntry(base: WPNativeClient, root: string): SiteClientEntry;
