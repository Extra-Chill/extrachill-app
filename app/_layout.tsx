/**
 * Root layout — mounts wp-native-shell's <WPNativeApp/> provider stack.
 *
 * WPNativeApp composes (outer → inner):
 *   ThemeProvider → AuthProvider → NavigationConfigProvider →
 *   BrowserHandoffProvider → AuthGate → {children}
 *
 * AuthGate intercepts unauthenticated users and renders LoginScreen.
 * Authenticated users see expo-router's <Slot/> which renders the
 * matched child route (index, onboarding, or the drawer group).
 */

import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { WPNativeApp } from 'wp-native-shell';
import { config, fallbackConfig } from '../extrachill.config';
import { getFontLoadState, registeredFonts } from '../src/theme/fonts';
import LoginScreen from './login';

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts(registeredFonts);
    const fontLoadState = getFontLoadState(fontsLoaded, fontError);

    if (fontLoadState === 'loading') {
        return null;
    }

    return (
        <WPNativeApp
            config={fontLoadState === 'ready' ? config : fallbackConfig}
            loginScreen={LoginScreen}
        >
            <Slot />
        </WPNativeApp>
    );
}
