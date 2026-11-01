import { useSiteClient } from '../../src/network/site-client';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { InboxBadge } from '../../src/inbox/Badge';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { Avatar } from '../../src/components';
import { COMMUNITY_REST_ROOT } from '../../src/community/client';
import { EVENTS_REST_ROOT } from '../../src/events/client';
import { eventTime } from '../../src/events/model';
import { displayDate } from '../../src/community/model';
import { StatePanel, communityStyles } from '../../src/community/components';
import { notificationRoute } from '../../src/inbox/model';
import { sceneActivity, sceneEvents, sceneStories } from '../../src/scene/client';
import { sectionState } from '../../src/scene/model';
import { useSection } from '../../src/scene/useSection';

function SceneSection({ title, onSeeAll, loading, error, empty, rows, retry, children }: {
    title: string; onSeeAll: () => void; loading: boolean; error: string;
    empty: string; rows: ReactNode[]; retry: () => void; children?: ReactNode;
}) {
    const theme = useTheme();
    const state = sectionState(loading, error, rows);
    return <View style={{ gap: 12 }}>
        <View style={communityStyles.rowBetween}>
            <Text accessibilityRole="header" style={[communityStyles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
            <Pressable accessibilityRole="link" accessibilityLabel={`See all: ${title}`} onPress={onSeeAll} style={{ padding: 12 }}>
                <Text style={{ color: theme.colors.primary }}>See all</Text>
            </Pressable>
        </View>
        {children}
        {state === 'loading' ? <StatePanel loading message={`Loading ${title}…`} />
            : state === 'error' ? <StatePanel message={error} actionLabel="Try again" onAction={retry} />
            : state === 'empty' ? <Text style={{ color: theme.colors.textMuted }}>{empty}</Text> : rows}
    </View>;
}

export default function Feed() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const { user, client } = useAuth();
    const theme = useTheme();
    const router = useRouter();
    const { handle } = useBrowserHandoff();
    const { client: eventsClient } = useSiteClient(EVENTS_REST_ROOT);
    const { client: communityClient } = useSiteClient(COMMUNITY_REST_ROOT);
    const events = useSection(useCallback(() => sceneEvents(client, eventsClient), [client, eventsClient]));
    const activity = useSection(useCallback(() => sceneActivity(communityClient), [communityClient]));
    const stories = useSection(useCallback(() => sceneStories(client), [client]));
    const [refreshing, setRefreshing] = useState(false);
    const refresh = async () => {
        setRefreshing(true);
        try { await Promise.all([events.load(), activity.load(), stories.load()]); }
        finally { setRefreshing(false); }
    };
    const card = (key: string, title: string, subtitle: string, onPress: () => void) => (
        <Pressable key={key} accessibilityRole="link" onPress={onPress}
            style={[communityStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[communityStyles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{title}</Text>
            <Text style={[communityStyles.meta, { color: theme.colors.textMuted }]}>{subtitle}</Text>
        </Pressable>
    );

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

            <ScrollView contentContainerStyle={communityStyles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.colors.primary} />}>
                <SceneSection title={events.data?.title ?? 'Tonight'} onSeeAll={() => router.push('/calendar')}
                    loading={events.loading} error={events.error} retry={() => void events.load()}
                    empty="No shows listed for tonight or this weekend."
                    rows={(events.data?.events ?? []).map(event => card(String(event.id), event.title,
                        [eventTime(event), event.venue?.name].filter(Boolean).join(' · '),
                        () => router.push(`/calendar/event/${event.id}`)))}>
                    {events.data && !events.data.location ? <Pressable accessibilityRole="link" onPress={() => router.push('/calendar')} style={{ paddingVertical: 8 }}>
                        <Text style={{ color: theme.colors.primary }}>Set your city</Text>
                    </Pressable> : events.data?.location ? <Text style={{ color: theme.colors.textMuted }}>{events.data.location.name}</Text> : null}
                </SceneSection>
                <SceneSection title="In the Community" onSeeAll={() => router.push('/community')}
                    loading={activity.loading} error={activity.error} retry={() => void activity.load()}
                    empty="No public activity yet."
                    rows={(activity.data ?? []).map((item, index) => card(`${item.canonical_url}:${index}`, item.title,
                        `${item.actor.display_name} · ${displayDate(item.timestamp)}`, () => {
                            const route = notificationRoute(item.canonical_url);
                            if (route) router.push(route as never);
                            else void handle(item.canonical_url);
                        }))} />
                {stories.data !== null && client.describe('extrachill/list-stories') ? <SceneSection
                    title="Latest stories" onSeeAll={() => router.push('/stories' as never)}
                    loading={stories.loading} error={stories.error} retry={() => void stories.load()}
                    empty="No stories published yet."
                    rows={(stories.data ?? []).map(story => card(String(story.id), story.title, displayDate(story.date),
                        () => router.push(`/stories/${story.id}` as never)))} /> : null}
            </ScrollView>
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
});
