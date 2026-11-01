import { useSiteClient } from '../../../src/network/site-client';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import type { WPNativeClient } from 'wp-native-client';
import { useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import { Button } from '../../../src/components';
import { CommunityHeader, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { canReadStories, listStories, WIRE_REST_ROOT, type StoryItem } from '../../../src/stories/client';
import { cleanExcerpt, displayDate, mergeStories, storyError, storyRouteParams, type StorySource } from '../../../src/stories/model';

export default function Stories() {
    const { client } = useAuth();
    const theme = useTheme();
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const { client: wireClient, ready: wireReady } = useSiteClient(WIRE_REST_ROOT);
    // Recomputed once the wire catalog is discovered; until then only the main list shows.
    const wireAvailable = wireReady && canReadStories(wireClient);
    const [source, setSource] = useState<StorySource>('main');
    const selectedSource = wireAvailable ? source : 'main';

    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title="Stories" subtitle="The Extra Chill publication" onLeadingPress={() => navigation.openDrawer()} />
        {wireAvailable ? <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 }}>
            {(['main', 'wire'] as const).map(value => <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: selectedSource === value }}
                onPress={() => setSource(value)}
                style={{ flex: 1, padding: 12, borderWidth: 1, borderRadius: 8, borderColor: selectedSource === value ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.surface }}
            ><Text style={{ textAlign: 'center', color: selectedSource === value ? theme.colors.primary : theme.colors.text }}>{value === 'main' ? 'Stories' : 'Festival Wire'}</Text></Pressable>)}
        </View> : null}
        <View style={{ flex: 1, display: selectedSource === 'main' ? 'flex' : 'none' }}>
            <StoryList client={client} source="main" />
        </View>
        {wireAvailable ? <View style={{ flex: 1, display: selectedSource === 'wire' ? 'flex' : 'none' }}>
            <StoryList client={wireClient} source="wire" />
        </View> : null}
    </SafeAreaView>;
}

// Keep each source mounted so paging, refresh, errors and scroll position stay
// independent, even when the reader switches tabs during an in-flight request.
function StoryList({ client, source }: { client: WPNativeClient; source: StorySource }) {
    const theme = useTheme();
    const router = useRouter();
    const available = canReadStories(client);
    const [items, setItems] = useState<StoryItem[]>([]);
    const [page, setPage] = useState(0);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [failedPage, setFailedPage] = useState(1);
    const busy = useRef(false);
    const generation = useRef(0);

    async function load(nextPage = 1, refresh = false) {
        if (busy.current || !available) return;
        busy.current = true;
        const request = generation.current;
        setLoading(!refresh);
        setRefreshing(refresh);
        setError('');
        try {
            const result = await listStories(client, { page: nextPage });
            if (request !== generation.current) return;
            setItems(previous => mergeStories(nextPage === 1 ? [] : previous, result.items));
            setPage(result.page);
            setPages(result.pages);
        } catch (err) {
            if (request === generation.current) {
                setFailedPage(nextPage);
                setError(storyError(err));
            }
        } finally {
            if (request === generation.current) {
                busy.current = false;
                setLoading(false);
                setRefreshing(false);
            }
        }
    }
    useEffect(() => {
        busy.current = false;
        setItems([]);
        setPage(0);
        setPages(0);
        void load();
        return () => { generation.current += 1; };
    }, [client, available]);

    return <>
        {!available ? <StatePanel message="Stories is not available yet." /> : loading && page === 0 ? <StatePanel loading message="Loading Stories..." /> :
            <FlatList
                data={items}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} tintColor={theme.colors.primary} />}
                ListEmptyComponent={!error ? <StatePanel message="No stories yet." /> : null}
                ListFooterComponent={error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load(failedPage)} /> : loading ? <StatePanel loading message="Loading Stories..." /> : page < pages ? <Button onPress={() => void load(page + 1)}>Load more</Button> : null}
                renderItem={({ item }) => <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/stories/[storyId]', params: storyRouteParams(item, source) })} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {item.featured_image ? <Image source={{ uri: item.featured_image.url }} accessibilityLabel={item.featured_image.alt} style={{ width: '100%', aspectRatio: item.featured_image.width > 0 && item.featured_image.height > 0 ? item.featured_image.width / item.featured_image.height : 1.5, borderRadius: 8 }} /> : null}
                    <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{cleanExcerpt(item.title)}</Text>
                    <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{item.author.name} · {displayDate(item.date)}</Text>
                    <Text style={[styles.body, { color: theme.colors.text }]}>{cleanExcerpt(item.excerpt)}</Text>
                </Pressable>}
            />}
    </>;
}
