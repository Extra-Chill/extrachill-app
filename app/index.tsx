/**
 * Entry point — redirects based on onboarding status.
 *
 * Auth gating (login redirect) is handled by WPNativeApp's AuthGate.
 * This screen only renders for authenticated users. It queries
 * `extrachill/get-onboarding-status` via the shell's client and
 * redirects to onboarding or the feed accordingly.
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from 'wp-native-shell';

interface OnboardingStatusResult {
    completed: boolean;
    fields: {
        username: string;
        user_is_artist: boolean;
        user_is_professional: boolean;
    };
}

export default function Index() {
    const router = useRouter();
    const { isLoading, isAuthenticated, client } = useAuth();
    const theme = useTheme();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (isLoading || !isAuthenticated) return;

        let cancelled = false;

        async function checkOnboarding() {
            try {
                const status = await client.execute<OnboardingStatusResult>(
                    'extrachill/get-onboarding-status',
                );

                if (cancelled) return;

                if (status.completed) {
                    router.replace('/(drawer)/feed');
                } else {
                    router.replace('/onboarding');
                }
            } catch {
                // If the onboarding check fails, assume complete and go to feed.
                // This prevents a broken onboarding endpoint from locking users out.
                if (!cancelled) {
                    router.replace('/(drawer)/feed');
                }
            } finally {
                if (!cancelled) {
                    setChecking(false);
                }
            }
        }

        void checkOnboarding();

        return () => {
            cancelled = true;
        };
    }, [isLoading, isAuthenticated, client, router]);

    if (isLoading || checking) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
