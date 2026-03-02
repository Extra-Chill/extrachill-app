/**
 * API client — thin adapter over @extrachill/api-client.
 *
 * All HTTP logic, token lifecycle, and type definitions live in the package.
 * This file only wires platform-specific storage (expo-secure-store) into
 * AuthFetchTransport, then exports the singleton client and transport.
 */

import { ExtraChillClient, AuthFetchTransport } from '@extrachill/api-client';
import type { StoredTokens } from '@extrachill/api-client';
import { storeTokens, getTokens, clearTokens, getDeviceId } from '../auth/storage';

export const transport = new AuthFetchTransport({
  baseUrl: 'https://extrachill.com/wp-json',
  getDeviceId,
  defaultHeaders: { 'ExtraChill-Client': 'app' },

  loadTokens: async (): Promise<StoredTokens | null> => {
    const tokens = await getTokens();
    if (!tokens.accessToken || !tokens.refreshToken || tokens.accessExpiresAt === null) {
      return null;
    }
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: tokens.accessExpiresAt,
    };
  },

  saveTokens: async (tokens: StoredTokens): Promise<void> => {
    await storeTokens(tokens.accessToken, tokens.refreshToken, tokens.accessExpiresAt);
  },

  clearTokens,
});

export const api = new ExtraChillClient(transport);
