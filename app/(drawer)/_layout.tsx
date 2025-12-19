/**
 * Drawer layout for authenticated app surfaces.
 * 
 * Protects all routes in this group - redirects to login if not authenticated.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/context';
import { useTheme } from '../../src/theme/context';
import { DrawerContent } from '../../src/components/DrawerContent';

export default function DrawerLayout() {
    const router = useRouter();
    const { isLoading, isAuthenticated } = useAuth();
    const { colors } = useTheme();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <View style={[styles.loading, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <Drawer
            screenOptions={{
                headerShown: false,
                drawerType: 'front',
            }}
            drawerContent={(props) => <DrawerContent {...props} />}
        />
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
