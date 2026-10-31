/**
 * Home screen.
 *
 * Placeholder for section-based navigation. The app will evolve to present
 * per-section views (events, community, blog, etc.) rather than a unified
 * activity feed.
 */

import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { InboxBadge } from '../../src/inbox/Badge';
import { useAuth, useTheme } from 'wp-native-shell';
import { Avatar } from '../../src/components';

export default function Feed() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const { user } = useAuth();
    const theme = useTheme();
    const router = useRouter();

    const openDrawer = () => {
        navigation.openDrawer();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: theme.spacing.md,
                        paddingVertical: theme.spacing.sm,
                    },
                ]}
            >
                <View style={styles.headerLeft}>
                    <Avatar url={user?.avatar_url} size={34} onPress={openDrawer} />
                </View>

                <View style={styles.headerCenter}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <Pressable accessibilityRole="button" accessibilityLabel="Open Inbox" onPress={() => router.push('/inbox')} style={styles.headerRight}>
                    <Text style={{ color: theme.colors.text }}>Inbox</Text>
                    <InboxBadge />
                </Pressable>
            </View>

            <View style={[styles.content, { padding: theme.spacing.xl }]}>
                <Text
                    style={{
                        color: theme.colors.textMuted,
                        fontSize: theme.typography.fontSizes.base,
                        fontFamily: theme.typography.fontFamily,
                        textAlign: 'center',
                    }}
                >
                    Welcome to Extra Chill
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
    },
    headerLeft: {
        width: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        width: 44,
    },
    logo: {
        height: 34,
        width: 120,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
