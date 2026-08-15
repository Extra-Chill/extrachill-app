export interface PublicVoice {
    reference: string;
    type: 'artist' | 'venue';
    id: number;
    name: string;
    url: string;
    accountable_user_id: number;
    automated: boolean;
}

export interface Forum {
    forum_id: number;
    title: string;
    parent_id: number;
    status: string;
    topic_count: number;
    reply_count: number;
    show_in_archive: boolean;
    url: string;
}

export interface Topic {
    topic_id: number;
    title: string;
    forum_id: number;
    author_id: number;
    author_name: string;
    status: 'publish' | 'closed';
    date: string;
    modified: string;
    reply_count: number;
    voice_count: number;
    url: string;
    content?: string;
    public_voice?: PublicVoice | null;
    upvote_count?: number;
}

export interface Reply {
    reply_id: number;
    topic_id: number;
    forum_id: number;
    author_id: number;
    author_name: string;
    content: string;
    status: 'publish';
    date: string;
    reply_to: number;
    url: string;
    public_voice?: PublicVoice | null;
    upvote_count?: number;
    upvoted?: boolean;
}

export interface ActivityItem {
    canonical_url: string;
    title: string;
    timestamp: string;
    activity_type: 'discussion' | 'reply';
    actor: { display_name: string; profile_url: string | null };
    relationships: {
        forum: { name: string; slug: string; canonical_url: string };
        artists: Array<{ name: string; slug: string; canonical_url: string }>;
    };
}

export interface PageResult<T> {
    total: number;
    pages: number;
    page: number;
    per_page: number;
    topics?: T[];
    replies?: T[];
}
