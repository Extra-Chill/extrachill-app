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
import { config } from '../extrachill.config';
import LoginScreen from './login';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Helvetica': require('../assets/fonts/helvetica.ttf'),
        'LoftSans': require('../assets/fonts/WilcoLoftSans-Treble.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <WPNativeApp config={config} loginScreen={LoginScreen}>
            <Slot />
        </WPNativeApp>
    );
}
