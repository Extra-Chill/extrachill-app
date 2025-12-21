/**
 * Entry point - redirects based on auth state
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/context';
import { useTheme } from '../src/theme/context';

export default function Index() {
    const router = useRouter();
    const { isLoading, isAuthenticated, onboardingCompleted } = useAuth();
    const { colors } = useTheme();

    useEffect(() => {
        if (isLoading) return;

        if (isAuthenticated) {
            if (onboardingCompleted) {
                router.replace('/(drawer)/feed');
            } else {
                router.replace('/onboarding');
            }
        } else {
            router.replace('/login');
        }
    }, [isLoading, isAuthenticated, onboardingCompleted, router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.text} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
