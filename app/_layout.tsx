/**
 * Root layout - wraps app with providers and loads fonts
 */

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { AuthProvider } from '../src/auth/context';
import { ThemeProvider } from '../src/theme/context';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Helvetica': require('../assets/fonts/helvetica.ttf'),
        'LoftSans': require('../assets/fonts/WilcoLoftSans-Treble.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <ThemeProvider>
            <AuthProvider>
                <Stack screenOptions={{ headerShown: false }} />
            </AuthProvider>
        </ThemeProvider>
    );
}
