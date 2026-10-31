import type { WPNativeClient } from 'wp-native-client';

export interface StoryItem {
    id: number;
    title: string;
    excerpt: string;
    date: string;
    author: { id: number; name: string };
    featured_image: { url: string; width: number; height: number; alt: string } | null;
    url: string;
    site: { blog_id: number; host: string };
}
export interface StoryDetail extends StoryItem {
    content_html: string;
    terms: Record<string, { id: number; name: string; slug: string; url: string }[]>;
}
export interface StoryFilters {
    page?: number;
    per_page?: number;
    category?: string | number;
    tag?: string | number;
    festival?: string | number;
    artist?: string | number;
    venue?: string | number;
    location?: string | number;
}
export interface StoryPage {
    items: StoryItem[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
}
export const canReadStories = (client: WPNativeClient) => Boolean(client.describe('extrachill/list-stories'));
export function listStories(client: WPNativeClient, input: StoryFilters = {}): Promise<StoryPage> {
    return client.execute('extrachill/list-stories', { per_page: 20, ...input });
}
export function getStory(client: WPNativeClient, id: number): Promise<StoryDetail> {
    return client.execute('extrachill/get-story', { id });
}
