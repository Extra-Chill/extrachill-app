/**
 * Root layout - wraps app with providers
 */

import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth/context';
import { ThemeProvider } from '../src/theme/context';

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Stack screenOptions={{ headerShown: false }} />
            </AuthProvider>
        </ThemeProvider>
    );
}
