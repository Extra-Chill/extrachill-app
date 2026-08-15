import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { COMMUNITY_REST_ROOT, listTopics } from '../../../../src/community/client';
import { CanonicalButton, CommunityHeader, IdentityLine, StatePanel, communityStyles } from '../../../../src/community/components';
import { communityError } from '../../../../src/community/model';
import type { Topic } from '../../../../src/community/types';

export default function ForumTopics() {
    const params = useLocalSearchParams<{ forumId: string; title?: string; url?: string }>();
    const router = useRouter();
    const { client } = useAuth();
    const { handle } = useBrowserHandoff();
    const theme = useTheme();
    const communityClient = useMemo(() => client.derive(COMMUNITY_REST_ROOT), [client]);
    const forumId = Number(params.forumId);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = async (nextPage = 1, refresh = false) => {
        if (!Number.isInteger(forumId) || forumId < 1) {
            setError('This room could not be found.');
            setLoading(false);
            return;
        }
        nextPage === 1 ? (refresh ? setRefreshing(true) : setLoading(true)) : setLoadingMore(true);
        setError('');
        try {
            const result = await listTopics(communityClient, forumId, nextPage);
            setTopics((current) => nextPage === 1 ? result.topics : [...current, ...result.topics]);
            setPage(result.page);
            setPages(result.pages);
        } catch (loadError) {
            setError(communityError(loadError).message);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        void load();
    }, [communityClient, forumId]);

    return (
        <SafeAreaView style={[communityStyles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
            <CommunityHeader
                title={params.title || 'Community room'}
                subtitle="Newest discussions first"
                leadingLabel="Back"
                onLeadingPress={() => router.back()}
                trailing={params.url ? <CanonicalButton onPress={() => void handle(params.url!)} label="Web" /> : null}
            />
            {loading ? <StatePanel loading message="Loading discussions..." /> : error && topics.length === 0 ? (
                <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} />
            ) : (
                <FlatList
                    data={topics}
                    keyExtractor={(topic) => String(topic.topic_id)}
                    contentContainerStyle={communityStyles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, true)} tintColor={theme.colors.primary} />}
                    ListEmptyComponent={<StatePanel message="No discussions have been started in this room." />}
                    ListFooterComponent={page < pages ? (
                        <Pressable
                            onPress={() => void load(page + 1)}
                            disabled={loadingMore}
                            accessibilityRole="button"
                            style={[communityStyles.button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                        >
                            <Text style={{ color: theme.colors.primary }}>{loadingMore ? 'Loading...' : 'Load more discussions'}</Text>
                        </Pressable>
                    ) : null}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => router.push({ pathname: '/community/topic/[topicId]', params: { topicId: String(item.topic_id) } })}
                            accessibilityRole="button"
                            style={[communityStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                        >
                            <View style={communityStyles.rowBetween}>
                                <Text style={[communityStyles.cardTitle, communityStyles.grow, { color: theme.colors.text }]}>{item.title}</Text>
                                {item.status === 'closed' ? <Text style={[communityStyles.meta, { color: theme.colors.error }]}>Closed</Text> : null}
                            </View>
                            <IdentityLine authorName={item.author_name} date={item.date} voice={item.public_voice} />
                            <Text style={[communityStyles.meta, { color: theme.colors.textMuted }]}>{item.reply_count} replies · {item.voice_count} participants</Text>
                        </Pressable>
                    )}
                />
            )}
        </SafeAreaView>
    );
}
