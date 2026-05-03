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

export const config: WPNativeConfig = {
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
        label: 'Feed',
        ability: 'wp/post.list',
        visibleWhen: (auth: AuthState) => auth.isAuthenticated,
      },
      // More sections added in follow-up issues. Keep this list minimal
      // for the first end-to-end dogfood.
    ],
  },

  browserHandoff: {
    handoffHosts: ['extrachill.com', '*.extrachill.com'],
    excludeHosts: ['*.extrachill.link'],
    handoffAbility: 'wp-native/auth-browser-handoff',
  },

  // Theme overrides — only override what we need; wp-native-shell's
  // deepMergeTokens fills in defaults for everything else.
  // TODO(M7.2): pull color tokens from @extrachill/tokens when the
  // migration lands. For now, leave default colors from wp-native-shell.
  theme: {
    typography: {
      fontFamily: 'WilcoLoftSans',
      fontFamilyBold: 'WilcoLoftSans-Bold',
      fontSizeBase: 16,
      fontSizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24 },
      lineHeights: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
    },
  },
};
