/**
 * extrachill.config.ts — Extra Chill app config for wp-native-shell.
 *
 * Consumed by <WPNativeApp config={config}/> in app/_layout.tsx (M7.2.5).
 *
 * The 0.1.0 surface dropped `brand` and `onboarding` from WPNativeConfig.
 * Brand strings are consumer-managed inline. Onboarding gating is
 * consumer-side — extrachill-app handles it in app/index.tsx by querying
 * the `extrachill/get-onboarding-status` ability directly.
 */

import type { WPNativeConfig, AuthState } from 'wp-native-shell';
import { secureStoreAdapter } from './src/auth/storage';
import { themeFontFamilies } from './src/theme/fonts';

const baseConfig: Omit<WPNativeConfig, 'theme'> = {
  api: {
    baseUrl: 'https://extrachill.com/wp-json',
    clientId: 'extrachill-app',
  },

  tokenStorage: secureStoreAdapter,

  navigation: {
    sections: [
      // Initial sections render as placeholders (M5.3 fallback) until
      // list/detail adapters land in follow-up issues.
      {
        id: 'feed',
        label: 'Scene',
        ability: 'wp/post.list',
        visibleWhen: (auth: AuthState) => auth.isAuthenticated,
      },
      {
        id: 'roadie-diagnostic',
        label: 'Roadie M0',
        visibleWhen: (auth: AuthState) => auth.isAuthenticated,
      },
    ],
  },

  browserHandoff: {
    handoffHosts: ['extrachill.com', '*.extrachill.com'],
    excludeHosts: ['*.extrachill.link'],
    handoffAbility: 'wp-native/auth-browser-handoff',
  },

};

export const config: WPNativeConfig = {
  ...baseConfig,
  theme: {
    typography: {
      fontFamily: themeFontFamilies.regular,
      fontSizeBase: 16,
      fontSizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
      lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
    },
  },
};

// If runtime font loading fails, preserve a readable app using shell defaults
// rather than configuring a family that React Native cannot resolve.
export const fallbackConfig: WPNativeConfig = baseConfig;
