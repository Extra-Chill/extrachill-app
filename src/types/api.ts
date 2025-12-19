/**
 * API response types for Extra Chill REST endpoints
 */

export interface AuthUser {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    profile_url?: string;
}

export interface LoginResponse {
    access_token: string;
    access_expires_at: string;
    refresh_token: string;
    refresh_expires_at: string;
    user: AuthUser;
}

export interface RefreshResponse {
    access_token: string;
    access_expires_at: string;
    refresh_token: string;
    refresh_expires_at: string;
    user: AuthUser;
}

export interface AuthMeResponse extends AuthUser {
    email: string;
    registered: string;
}

export interface ApiError {
    code: string;
    message: string;
    data?: {
        status: number;
    };
}

// Activity Feed Types
export interface ActivityObject {
    object_type: string;
    blog_id: number;
    id: string;
}

export interface ActivityCardData {
    title?: string;
    excerpt?: string;
    permalink?: string;
}

export interface ActivityItemData {
    post_type?: string;
    post_id?: number;
    card?: ActivityCardData;
}

export interface ActivityItem {
    id: number;
    created_at: string; // ISO8601 UTC
    type: string;
    blog_id: number;
    actor_id: number | null;
    summary: string;
    visibility: 'public' | 'private';
    primary_object: ActivityObject;
    secondary_object?: ActivityObject;
    data?: ActivityItemData;
}

export interface ActivityResponse {
    items: ActivityItem[];
    next_cursor: number | null;
}
