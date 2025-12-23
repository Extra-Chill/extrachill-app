/**
 * API client for Extra Chill REST endpoints
 * 
 * Centralizes authentication with automatic token refresh.
 * Uses a refresh lock to prevent thundering herd on concurrent 401s.
 */

import type { LoginResponse, RegisterResponse, RefreshResponse, BrowserHandoffResponse, AuthMeResponse, ActivityResponse, ApiError, OnboardingStatusResponse, OnboardingSubmitResponse, OAuthConfigResponse, GoogleLoginResponse } from '../types/api';
import { storeTokens, getTokens, clearTokens, getDeviceId, type StoredTokens } from '../auth/storage';

const API_BASE = 'https://extrachill.com/wp-json/extrachill/v1';
const REFRESH_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiry

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
    requiresAuth?: boolean;
    headers?: Record<string, string>;
}

class ApiClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private accessExpiresAt: number | null = null;
    private refreshPromise: Promise<boolean> | null = null;
    private onAuthFailure: (() => void) | null = null;
    private initialized = false;

    /**
     * Initialize the client with stored tokens and auth failure callback.
     */
    async initialize(onAuthFailure: () => void): Promise<void> {
        this.onAuthFailure = onAuthFailure;
        
        const tokens = await getTokens();
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.accessExpiresAt = tokens.accessExpiresAt;
        this.initialized = true;
    }

    /**
     * Check if client has tokens loaded.
     */
    hasTokens(): boolean {
        return this.accessToken !== null && this.refreshToken !== null;
    }

    /**
     * Store tokens in memory and SecureStore.
     */
    private async setTokens(
        accessToken: string,
        refreshToken: string,
        accessExpiresAt: number
    ): Promise<void> {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.accessExpiresAt = accessExpiresAt;
        
        await storeTokens(accessToken, refreshToken, accessExpiresAt);
    }

    /**
     * Clear tokens from memory and SecureStore.
     */
    async clearAuth(): Promise<void> {
        this.accessToken = null;
        this.refreshToken = null;
        this.accessExpiresAt = null;
        
        await clearTokens();
    }

    /**
     * Check if access token is expiring within the buffer window.
     */
    private isAccessExpiringSoon(): boolean {
        if (!this.accessExpiresAt) return true;
        
        const nowMs = Date.now();
        const expiresAtMs = this.accessExpiresAt * 1000;
        
        return nowMs >= expiresAtMs - REFRESH_BUFFER_MS;
    }

    /**
     * Refresh the access token. Uses a lock to prevent concurrent refreshes.
     * Returns true if refresh succeeded, false if it failed.
     */
    private async refreshAccessToken(): Promise<boolean> {
        // If refresh is already in progress, wait for it
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        // Start refresh with lock
        this.refreshPromise = this.executeRefresh();
        
        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    /**
     * Execute the actual refresh request.
     */
    private async executeRefresh(): Promise<boolean> {
        if (!this.refreshToken) {
            return false;
        }

        try {
            const deviceId = await getDeviceId();
            
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refresh_token: this.refreshToken,
                    device_id: deviceId,
                }),
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json() as RefreshResponse;
            const expiresAt = Math.floor(new Date(data.access_expires_at).getTime() / 1000);
            
            await this.setTokens(data.access_token, data.refresh_token, expiresAt);
            
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Ensure we have a valid access token. Refreshes proactively if needed.
     * Returns true if we have a valid token, false if auth failed.
     */
    private async ensureValidToken(): Promise<boolean> {
        if (!this.accessToken || !this.refreshToken) {
            return false;
        }

        if (this.isAccessExpiringSoon()) {
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                await this.handleAuthFailure();
                return false;
            }
        }

        return true;
    }

    /**
     * Handle authentication failure - clear tokens and notify context.
     */
    private async handleAuthFailure(): Promise<void> {
        await this.clearAuth();
        this.onAuthFailure?.();
    }

    /**
     * Make an API request with automatic auth handling.
     */
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', body, requiresAuth = true, headers: customHeaders } = options;

        // Ensure valid token for authenticated requests
        if (requiresAuth) {
            const hasValidToken = await this.ensureValidToken();
            if (!hasValidToken) {
                throw new Error('Session expired');
            }
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...customHeaders,
        };

        if (requiresAuth && this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        // Handle 401 - attempt refresh and retry once
        if (response.status === 401 && requiresAuth) {
            const refreshed = await this.refreshAccessToken();
            
            if (!refreshed) {
                await this.handleAuthFailure();
                throw new Error('Session expired');
            }

            // Retry with new token
            headers['Authorization'] = `Bearer ${this.accessToken}`;
            
            const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!retryResponse.ok) {
                const error = await retryResponse.json() as ApiError;
                throw new Error(error.message || 'Request failed');
            }

            return await retryResponse.json() as T;
        }

        if (!response.ok) {
            const error = await response.json() as ApiError;
            throw new Error(error.message || 'Request failed');
        }

        return await response.json() as T;
    }

    /**
     * Login and store tokens.
     */
    async login(identifier: string, password: string): Promise<LoginResponse> {
        const deviceId = await getDeviceId();
        
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: {
                identifier,
                password,
                device_id: deviceId,
            },
            requiresAuth: false,
        });

        const expiresAt = Math.floor(new Date(response.access_expires_at).getTime() / 1000);
        await this.setTokens(response.access_token, response.refresh_token, expiresAt);

        return response;
    }

    /**
     * Register a new user and store tokens.
     */
    async register(email: string, password: string, passwordConfirm: string): Promise<RegisterResponse> {
        const deviceId = await getDeviceId();
        
        const response = await this.request<RegisterResponse>('/auth/register', {
            method: 'POST',
            body: {
                email,
                password,
                password_confirm: passwordConfirm,
                device_id: deviceId,
                registration_source: 'extrachill-app',
                registration_method: 'standard',
            },
            requiresAuth: false,
            headers: {
                'ExtraChill-Client': 'app',
            },
        });

        const expiresAt = Math.floor(new Date(response.access_expires_at).getTime() / 1000);
        await this.setTokens(response.access_token, response.refresh_token, expiresAt);

        return response;
    }

    /**
     * Logout and clear tokens.
     */
    async logout(): Promise<void> {
        try {
            if (this.accessToken) {
                const deviceId = await getDeviceId();
                await this.request<void>('/auth/logout', {
                    method: 'POST',
                    body: { device_id: deviceId },
                });
            }
        } catch {
            // Ignore logout errors, clear tokens anyway
        }

        await this.clearAuth();
    }

    /**
     * Create a one-time URL to log into the website.
     */
    async createBrowserHandoffUrl(redirectUrl: string): Promise<string> {
        const response = await this.request<BrowserHandoffResponse>('/auth/browser-handoff', {
            method: 'POST',
            body: {
                redirect_url: redirectUrl,
            },
        });

        return response.handoff_url;
    }

    /**
     * Get current user info.
     */
    async getMe(): Promise<AuthMeResponse> {
        return this.request<AuthMeResponse>('/auth/me');
    }


    /**
     * Get activity feed.
     */
    async getActivity(cursor?: string, limit = 20): Promise<ActivityResponse> {
        const params = new URLSearchParams();
        if (cursor) params.append('cursor', cursor);
        params.append('limit', limit.toString());

        return this.request<ActivityResponse>(`/activity?${params.toString()}`);
    }

    /**
     * Get current user's onboarding status.
     */
    async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
        return this.request<OnboardingStatusResponse>('/users/onboarding');
    }

    /**
     * Complete onboarding with username and preferences.
     */
    async submitOnboarding(
        username: string,
        userIsArtist: boolean,
        userIsProfessional: boolean
    ): Promise<OnboardingSubmitResponse> {
        return this.request<OnboardingSubmitResponse>('/users/onboarding', {
            method: 'POST',
            body: {
                username,
                user_is_artist: userIsArtist,
                user_is_professional: userIsProfessional,
            },
        });
    }

    /**
     * Get OAuth configuration from server.
     */
    async getOAuthConfig(): Promise<OAuthConfigResponse> {
        return this.request<OAuthConfigResponse>('/config/oauth', {
            requiresAuth: false,
        });
    }

    /**
     * Login with Google ID token and store tokens.
     */
    async loginWithGoogle(idToken: string): Promise<GoogleLoginResponse> {
        const deviceId = await getDeviceId();
        
        const response = await this.request<GoogleLoginResponse>('/auth/google', {
            method: 'POST',
            body: {
                id_token: idToken,
                device_id: deviceId,
                registration_source: 'extrachill-app',
                registration_method: 'google',
            },
            requiresAuth: false,
        });

        const expiresAt = Math.floor(new Date(response.access_expires_at).getTime() / 1000);
        await this.setTokens(response.access_token, response.refresh_token, expiresAt);

        return response;
    }
}

export const api = new ApiClient();
