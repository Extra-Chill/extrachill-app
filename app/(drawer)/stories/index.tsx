import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, Text } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import { Button } from '../../../src/components';
import { CommunityHeader, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { canReadStories, listStories, type StoryItem } from '../../../src/stories/client';
import { cleanExcerpt, displayDate, mergeStories, storyError } from '../../../src/stories/model';

export default function Stories() {
    const { client } = useAuth();
    const theme = useTheme();
    const router = useRouter();
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
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

    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title="Stories" subtitle="The Extra Chill publication" onLeadingPress={() => navigation.openDrawer()} />
        {!available ? <StatePanel message="Stories is not available yet." /> : loading && page === 0 ? <StatePanel loading message="Loading Stories..." /> :
            <FlatList
                data={items}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} tintColor={theme.colors.primary} />}
                ListEmptyComponent={!error ? <StatePanel message="No stories yet." /> : null}
                ListFooterComponent={error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load(failedPage)} /> : loading ? <StatePanel loading message="Loading Stories..." /> : page < pages ? <Button onPress={() => void load(page + 1)}>Load more</Button> : null}
                renderItem={({ item }) => <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/stories/[storyId]', params: { storyId: item.id } })} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {item.featured_image ? <Image source={{ uri: item.featured_image.url }} accessibilityLabel={item.featured_image.alt} style={{ width: '100%', aspectRatio: item.featured_image.width > 0 && item.featured_image.height > 0 ? item.featured_image.width / item.featured_image.height : 1.5, borderRadius: 8 }} /> : null}
                    <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{cleanExcerpt(item.title)}</Text>
                    <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{item.author.name} · {displayDate(item.date)}</Text>
                    <Text style={[styles.body, { color: theme.colors.text }]}>{cleanExcerpt(item.excerpt)}</Text>
                </Pressable>}
            />}
    </SafeAreaView>;
}
