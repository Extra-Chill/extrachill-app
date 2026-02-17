/**
 * Root layout - wraps app with providers and loads fonts
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { AuthProvider } from '../src/auth/context';
import { ThemeProvider } from '../src/theme/context';
import { objectCache } from '../src/cache/objectCache';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Helvetica': require('../assets/fonts/helvetica.ttf'),
        'LoftSans': require('../assets/fonts/WilcoLoftSans-Treble.ttf'),
    });

    // Hydrate object cache from AsyncStorage on app start
    useEffect(() => {
        objectCache.initialize();
    }, []);

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
