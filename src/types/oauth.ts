/**
 * Local OAuth type definitions.
 *
 * These types were previously imported from @extrachill/api-client.
 * Moved here as part of M8 retirement (issue #37).
 * Shapes match the extrachill/v1/auth REST endpoints.
 */

/** Response from GET extrachill/v1/auth/oauth-config */
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

/** Response from POST extrachill/v1/auth/google */
export interface GoogleLoginResponse {
    success: boolean;
    access_token: string;
    access_expires_at: string;
    refresh_token: string;
    refresh_expires_at: string;
    user: {
        id: number;
        username: string;
        display_name: string;
        avatar_url?: string;
        profile_url?: string;
    };
    onboarding_completed: boolean;
    redirect_url: string;
    invite_artist_id?: number;
}

/** Response from wp-native-shell ability extrachill/get-onboarding-status */
export interface OnboardingStatusResponse {
    completed: boolean;
    from_join: boolean;
    fields: {
        username: string;
        user_is_artist: boolean;
        user_is_professional: boolean;
    };
}

/**
 * Token data for the EC REST transport.
 *
 * All fields are required (non-nullable). This is distinct from the
 * storage.ts StoredTokens where fields are nullable (pre-login state).
 */
export interface ECStoredTokens {
    accessToken: string;
    refreshToken: string;
    /** Unix timestamp (seconds) when the access token expires. */
    accessExpiresAt: number;
}
