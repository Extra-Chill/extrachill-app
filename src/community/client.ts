import type { WPNativeClient } from 'wp-native-client';
import { plainTextToHtml } from './model';
import type { ActivityItem, Forum, PublicVoice, Reply, Topic } from './types';

export const COMMUNITY_REST_ROOT = 'https://community.extrachill.com/wp-json/';
export const PAGE_SIZE = 20;

export function listForums(client: WPNativeClient): Promise<{ forums: Forum[] }> {
    return client.execute('extrachill/community-list-forums', { archive_only: true });
}

export function listTopics(client: WPNativeClient, forumId: number, page = 1) {
    return client.execute<{ topics: Topic[]; total: number; pages: number; page: number; per_page: number }>(
        'extrachill/community-list-topics',
        { forum_id: forumId, per_page: PAGE_SIZE, page, orderby: 'date', order: 'DESC' },
    );
}

export function getTopic(client: WPNativeClient, topicId: number) {
    return client.execute<{ topic: Topic; replies: Reply[]; replies_total: number; replies_pages: number }>(
        'extrachill/community-get-topic',
        { topic_id: topicId, include_replies: true, replies_per_page: PAGE_SIZE, replies_page: 1 },
    );
}

export function listReplies(client: WPNativeClient, topicId: number, page: number) {
    return client.execute<{ replies: Reply[]; total: number; pages: number; page: number; per_page: number }>(
        'extrachill/community-list-replies',
        { topic_id: topicId, per_page: PAGE_SIZE, page },
    );
}

export function recentActivity(client: WPNativeClient) {
    return client.execute<{ schema_version: '1'; items: ActivityItem[] }>(
        'extrachill/community-recent-public-activity',
        { limit: 5 },
    );
}

export function createReply(client: WPNativeClient, topicId: number, content: string) {
    return client.execute<{
        reply_id: number;
        topic_id: number;
        forum_id: number;
        url: string;
        author_id: number;
        public_voice?: PublicVoice | null;
    }>('extrachill/community-create-reply', { topic_id: topicId, content: plainTextToHtml(content), format: 'html' });
}

export function toggleUpvote(client: WPNativeClient, postId: number, type: 'topic' | 'reply') {
    return client.execute<{ message: string; new_count: number; upvoted: boolean }>(
        'extrachill/community-upvote',
        { post_id: postId, type },
    );
}
