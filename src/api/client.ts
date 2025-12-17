/**
 * API client for Extra Chill REST endpoints
 */

import type { LoginResponse, RefreshResponse, AuthMeResponse, ApiError } from '../types/api';

const API_BASE = 'https://extrachill.com/wp-json/extrachill/v1';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
    token?: string;
}

class ApiClient {
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { method = 'GET', body, token } = options;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
            const error = data as ApiError;
            throw new Error(error.message || 'Request failed');
        }

        return data as T;
    }

    async login(identifier: string, password: string, deviceId: string): Promise<LoginResponse> {
        return this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: {
                identifier,
                password,
                device_id: deviceId,
            },
        });
    }

    async refresh(refreshToken: string, deviceId: string): Promise<RefreshResponse> {
        return this.request<RefreshResponse>('/auth/refresh', {
            method: 'POST',
            body: {
                refresh_token: refreshToken,
                device_id: deviceId,
            },
        });
    }

    async getMe(accessToken: string): Promise<AuthMeResponse> {
        return this.request<AuthMeResponse>('/auth/me', {
            token: accessToken,
        });
    }

    async logout(accessToken: string, deviceId: string): Promise<void> {
        return this.request<void>('/auth/logout', {
            method: 'POST',
            token: accessToken,
            body: {
                device_id: deviceId,
            },
        });
    }
}

export const api = new ApiClient();
