import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { CommunityHeader, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { communityError, displayDate } from '../../../src/community/model';
import { listNotifications, type Notification } from '../../../src/inbox/client';
import { isUnread, mergeNotifications, notificationRoute } from '../../../src/inbox/model';
import { useInbox } from '../../../src/inbox/context';
import { MemberIdentity } from '../../../src/members/MemberIdentity';

export default function Inbox() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const router = useRouter();
    const { client } = useAuth();
    const { handle } = useBrowserHandoff();
    const { markRead, refresh } = useInbox();
    const theme = useTheme();
    const [unread, setUnread] = useState(false);
    const [items, setItems] = useState<Notification[]>([]);
    const [page, setPage] = useState(0);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const pending = useRef(false);
    const load = useCallback(async (nextPage = 1, pull = false) => {
        if (nextPage > 1 && pending.current) return;
        const request = ++generation.current;
        pending.current = true;
        setError('');
        if (nextPage > 1) setLoadingMore(true);
        else if (pull) setRefreshing(true);
        else setLoading(true);
        try {
            const result = await listNotifications(client, unread, nextPage);
            if (request !== generation.current) return;
            setItems(previous => mergeNotifications(nextPage === 1 ? [] : previous, result.notifications));
            setPage(result.page);
            setPages(result.pages);
            void refresh();
        } catch (err) {
            if (request === generation.current) setError(communityError(err).message);
        } finally {
            if (request === generation.current) {
                pending.current = false;
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        }
    }, [client, unread, refresh]);
    useEffect(() => {
        setItems([]);
        setPage(0);
        setPages(0);
        void load();
        return () => { generation.current++; pending.current = false; };
    }, [load]);

    const read = async (item?: Notification) => {
        if (busy) return;
        setBusy(true);
        setError('');
        // Invalidate a page fetched before the mutation so it cannot restore unread rows.
        generation.current++;
        pending.current = false;
        try {
            await markRead(item?.id);
            if (item) {
                setItems(previous => unread ? previous.filter(row => row.id !== item.id) : previous.map(row => row.id === item.id ? { ...row, is_read: true } : row));
                // Removing unread rows shifts server offsets; restart pagination before returning.
                if (unread) await load(1, true);
                const route = notificationRoute(item.link);
                if (route?.startsWith('/calendar/event/')) router.push({ pathname: '/calendar/event/[eventId]', params: { eventId: route.split('/').pop()!, url: item.link } });
                else if (route) router.push(route);
                else await handle(item.link);
            } else {
                await load(1, true);
            }
        } catch (err) {
            setError(communityError(err).message);
        } finally {
            setBusy(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title="Inbox" subtitle="Your network notifications" onLeadingPress={() => navigation.openDrawer()} />
        <View style={[styles.rowBetween, { padding: 16 }]}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
                {[false, true].map(value => <Pressable key={String(value)} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: unread === value }} onPress={() => setUnread(value)}>
                    <Text style={{ color: unread === value ? theme.colors.primary : theme.colors.textMuted }}>{value ? 'Unread' : 'All'}</Text>
                </Pressable>)}
            </View>
            <Pressable disabled={busy || loading} accessibilityRole="button" onPress={() => void read()}><Text style={{ color: theme.colors.primary }}>{busy ? 'Saving...' : 'Mark all read'}</Text></Pressable>
        </View>
        {loading ? <StatePanel loading message="Loading Inbox..." /> : <>
            {error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load(1, true)} /> : null}
            <FlatList
                data={items}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { if (!busy) void load(1, true); }} tintColor={theme.colors.primary} />}
                ListEmptyComponent={<Text style={[styles.body, { color: theme.colors.textMuted }]}>{unread ? 'You’re all caught up.' : 'No notifications yet.'}</Text>}
                renderItem={({ item }) => <Pressable disabled={busy} accessibilityRole="link" accessibilityLabel={`${isUnread(item) ? 'Unread: ' : ''}${item.title}`} onPress={() => void read(item)} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {item.actor_id && item.actor_display_name ? <MemberIdentity id={item.actor_id} name={item.actor_display_name} /> : null}
                    <Text style={[styles.cardTitle, { color: theme.colors.text, fontWeight: isUnread(item) ? '700' : '400' }]}>{isUnread(item) ? '● ' : ''}{item.title}</Text>
                    <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{displayDate(item.created_at)}</Text>
                </Pressable>}
                ListFooterComponent={page < pages ? <Pressable disabled={loadingMore || busy} accessibilityRole="button" onPress={() => void load(page + 1)} style={styles.card}><Text style={{ color: theme.colors.primary }}>{loadingMore ? 'Loading...' : 'Load more'}</Text></Pressable> : null}
            />
        </>}
    </SafeAreaView>;
}
