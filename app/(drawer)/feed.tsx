/**
 * Activity feed screen.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { useAuth } from '../../src/auth/context';
import { useTheme } from '../../src/theme/context';
import { api } from '../../src/api/client';
import { ActivityCard, Avatar } from '../../src/components';
import type { ActivityItem } from '../../src/types/api';

export default function Feed() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const { user } = useAuth();
    const { colors, spacing, fontSize, fontFamily } = useTheme();

    const [items, setItems] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchFeed = useCallback(async (cursor?: number) => {
        try {
            const response = await api.getActivity(cursor?.toString(), 20);
            return response;
        } catch (err) {
            throw err instanceof Error ? err : new Error('Failed to load feed');
        }
    }, []);

    const loadInitial = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchFeed();
            if (response) {
                setItems(response.items);
                setNextCursor(response.next_cursor);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load feed');
        } finally {
            setIsLoading(false);
        }
    }, [fetchFeed]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await fetchFeed();
            if (response) {
                setItems(response.items);
                setNextCursor(response.next_cursor);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh feed');
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchFeed]);

    const handleLoadMore = useCallback(async () => {
        if (isLoadingMore || !nextCursor) return;

        setIsLoadingMore(true);

        try {
            const response = await fetchFeed(nextCursor);
            if (response) {
                setItems((prev) => [...prev, ...response.items]);
                setNextCursor(response.next_cursor);
            }
        } catch {
            // ignore
        } finally {
            setIsLoadingMore(false);
        }
    }, [fetchFeed, nextCursor, isLoadingMore]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    const openDrawer = () => {
        navigation.openDrawer();
    };

    const renderHeader = () => (
        <View
            style={[
                styles.header,
                {
                    backgroundColor: colors.headerBackground,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
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

            <View style={styles.headerRight} />
        </View>
    );

    const renderItem = useCallback(({ item }: { item: ActivityItem }) => (
        <ActivityCard item={item} />
    ), []);

    const renderFooter = () => {
        if (!isLoadingMore) return null;

        return (
            <View style={[styles.footer, { padding: spacing.md }]}> 
                <ActivityIndicator color={colors.muted} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (isLoading) return null;

        return (
            <View style={[styles.emptyContainer, { padding: spacing.xl }]}> 
                <Text
                    style={{
                        color: colors.muted,
                        fontSize: fontSize.base,
                        fontFamily: fontFamily.body,
                        textAlign: 'center',
                    }}
                >
                    No activity yet
                </Text>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                {renderHeader()}
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.text} />
                </View>
            </SafeAreaView>
        );
    }

    if (error && items.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                {renderHeader()}
                <View style={[styles.centered, { padding: spacing.xl }]}> 
                    <Text
                        style={{
                            color: colors.error,
                            fontSize: fontSize.base,
                            fontFamily: fontFamily.body,
                            marginBottom: spacing.md,
                            textAlign: 'center',
                        }}
                    >
                        {error}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {renderHeader()}
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.muted}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    footer: {
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
    },
});
