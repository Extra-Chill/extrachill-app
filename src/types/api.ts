/**
 * API response types for Extra Chill REST endpoints
 */

export interface User {
    id: number;
    username: string;
    email: string;
    display_name: string;
}

export interface LoginResponse {
    access_token: string;
    access_expires_at: string;
    refresh_token: string;
    refresh_expires_at: string;
    user: User;
}

export interface RefreshResponse {
    access_token: string;
    access_expires_at: string;
    refresh_token: string;
    refresh_expires_at: string;
}

export interface AuthMeResponse {
    id: number;
    username: string;
    email: string;
    display_name: string;
}

export interface ApiError {
    code: string;
    message: string;
    data?: {
        status: number;
    };
}
