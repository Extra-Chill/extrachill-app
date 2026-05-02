/**
 * Smoke test for M7.2.2 — verifies wp-native-client + wp-native-shell
 * are installed and resolvable. Excluded from the main tsconfig include.
 *
 * Delete this file when M7.2.5 lands (<WPNativeApp/> mounted means the
 * imports are already exercised by real code).
 */
import type { WPNativeConfig, AuthState, ThemeTokens } from 'wp-native-shell';
import { WPNativeClient } from 'wp-native-client';

// Reference each import so unused-import checks don't flag them.
export type { WPNativeConfig, AuthState, ThemeTokens };
export { WPNativeClient };
