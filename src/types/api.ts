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

export interface RegisterResponse extends LoginResponse {
    onboarding_completed: boolean;
    redirect_url: string;
    invite_artist_id?: number;
}

export interface OnboardingStatusResponse {
    completed: boolean;
    from_join: boolean;
    fields: {
        username: string;
        user_is_artist: boolean;
        user_is_professional: boolean;
    };
}

export interface OnboardingSubmitResponse {
    success: boolean;
    user: {
        id: number;
        username: string;
        user_is_artist: boolean;
        user_is_professional: boolean;
    };
    redirect_url: string;
}

export interface GoogleLoginResponse extends RegisterResponse {
    success: boolean;
}

export interface OAuthConfigResponse {
    google: {
        enabled: boolean;
        web_client_id: string;
        ios_client_id: string;
        android_client_id: string;
    };
    apple: {
        enabled: boolean;
    };
}

export interface RefreshResponse {
    access_token: string;
    access_expires_at: string;
    refresh_token: string;
    refresh_expires_at: string;
    user: AuthUser;
}

export interface BrowserHandoffResponse {
    handoff_url: string;
}

export interface AuthMeResponse extends AuthUser {
    email: string;
    registered: string;

    artist_ids?: number[];
    latest_artist_id?: number;
    link_page_count?: number;
    can_manage_shop?: boolean;
    shop_product_count?: number;
    can_create_artists?: boolean;
    site_urls?: {
        community: string;
        artist: string;
        shop: string;
    };
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
    // Event metadata
    event_date?: string;
    event_time?: string;
    venue_name?: string;
    // Reply metadata
    parent_topic_id?: number;
    parent_topic_title?: string;
}

export interface ActivityTaxonomyTerm {
    id: number;
    slug: string;
    name: string;
    badge?: {
        background_color: string;
        text_color: string;
    };
}

export interface ActivityItemData {
    post_type?: string;
    post_id?: number;
    card?: ActivityCardData;
    taxonomies?: Record<string, ActivityTaxonomyTerm[]> | null;
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
