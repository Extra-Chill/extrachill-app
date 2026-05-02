/**
 * extrachill.config.ts — Extra Chill app config for wp-native-shell.
 *
 * Consumed by <WPNativeApp config={config}/> in app/_layout.tsx (M7.2.5).
 * Until then, this file is dormant — its presence verifies the SHELL.md
 * contract type-checks against EC's specifics.
 */

import type { WPNativeConfig, AuthState } from 'wp-native-shell';
import { secureStoreAdapter } from './src/auth/storage';
import OnboardingScreen from './app/onboarding';

export const config: WPNativeConfig = {
  api: {
    baseUrl: 'https://extrachill.com/wp-json',
    clientId: 'extrachill-app',
    defaultHeaders: { 'ExtraChill-Client': 'app' },
  },

  brand: {
    name: 'Extra Chill',
    welcomeMessage: 'Welcome to Extra Chill',
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

  // Theme overrides — pull EC-specific tokens, fall back to defaults
  // for everything else. Spread merges via wp-native-shell's
  // deepMergeTokens at runtime.
  theme: {
    colors: {
      // TODO(M7.2): pull from @extrachill/tokens when the migration lands.
      // For now, leave defaults from wp-native-shell.
    },
    typography: {
      fontFamily: 'WilcoLoftSans',
      fontFamilyBold: 'WilcoLoftSans-Bold',
    },
  },

  onboarding: {
    enabled: true,
    ability: 'extrachill/complete-onboarding',
    screen: OnboardingScreen,
  },
};
