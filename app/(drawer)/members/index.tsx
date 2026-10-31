import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import { CommunityHeader, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { communityError } from '../../../src/community/model';
import { defaultLocation } from '../../../src/events/client';
import { listSceneMembers, type MemberCard } from '../../../src/members/client';
import { MemberIdentity } from '../../../src/members/MemberIdentity';
import { mergeMembers } from '../../../src/members/model';

export default function SceneMembers() {
    const { client } = useAuth();
    const theme = useTheme();
    const router = useRouter();
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const [items, setItems] = useState<MemberCard[]>([]);
    const [slug, setSlug] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const pending = useRef(false);
    const load = async (next = 1, pull = false) => {
        if (next > 1 && pending.current) return;
        const request = ++generation.current;
        pending.current = true;
        next > 1 ? setLoadingMore(true) : pull ? setRefreshing(true) : setLoading(true);
        setError('');
        try {
            const locationSlug = next === 1 ? (await defaultLocation(client))?.slug || '' : slug;
            if (request !== generation.current) return;
            if (!locationSlug) { setSlug(''); setItems([]); setHasMore(false); setPage(0); return; }
            const result = await listSceneMembers(client, locationSlug, next);
            if (request !== generation.current) return;
            setSlug(locationSlug);
            setItems(current => mergeMembers(next === 1 ? [] : current, result.members));
            setPage(result.page);
            setHasMore(result.hasMore);
        } catch (err) { if (request === generation.current) setError(communityError(err).message); }
        finally {
            if (request === generation.current) { pending.current = false; setLoading(false); setRefreshing(false); setLoadingMore(false); }
        }
    };
    useFocusEffect(useCallback(() => {
        void load();
        return () => { generation.current++; pending.current = false; };
    }, [client]));
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title="People in your scene" subtitle={slug || undefined} onLeadingPress={() => navigation.openDrawer()} />
        {loading ? <StatePanel loading message="Loading people..." /> : <FlatList
            data={items} keyExtractor={item => String(item.user_id)} contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} tintColor={theme.colors.primary} />}
            ListHeaderComponent={error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load(1, true)} /> : null}
            ListEmptyComponent={!error ? <StatePanel message={slug ? 'No members in this scene yet.' : 'Choose your market in Calendar to find people in your scene.'} actionLabel={!slug ? 'Open Calendar' : undefined} onAction={() => router.push('/calendar')} /> : null}
            renderItem={({ item }) => <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <MemberIdentity id={item.user_id} name={item.display_name} avatar={item.avatar_url} />
                {item.custom_title ? <Text style={{ color: theme.colors.textMuted }}>{item.custom_title}</Text> : null}
            </View>}
            ListFooterComponent={hasMore ? <Pressable disabled={loadingMore || refreshing} accessibilityRole="button" style={styles.button} onPress={() => void load(page + 1)}><Text style={{ color: theme.colors.primary }}>{loadingMore ? 'Loading...' : 'Load more people'}</Text></Pressable> : null}
        />}
    </SafeAreaView>;
}
