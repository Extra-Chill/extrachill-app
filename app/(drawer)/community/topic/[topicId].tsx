import { useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import {
    COMMUNITY_REST_ROOT,
    createReply,
    getTopic,
    listReplies,
    toggleUpvote,
} from '../../../../src/community/client';
import { CanonicalButton, CommunityHeader, IdentityLine, StatePanel, communityStyles } from '../../../../src/community/components';
import { communityError, mergeReplies, plainText } from '../../../../src/community/model';
import type { Reply, Topic } from '../../../../src/community/types';

export default function TopicDetail() {
    const { topicId: topicParam } = useLocalSearchParams<{ topicId: string }>();
    const topicId = Number(topicParam);
    const router = useRouter();
    const { client, user } = useAuth();
    const { handle } = useBrowserHandoff();
    const theme = useTheme();
    const communityClient = useMemo(() => client.derive(COMMUNITY_REST_ROOT), [client]);
    const [topic, setTopic] = useState<Topic | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [replyPage, setReplyPage] = useState(1);
    const [replyPages, setReplyPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [sending, setSending] = useState(false);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const load = async (refresh = false) => {
        if (!Number.isInteger(topicId) || topicId < 1) {
            setError('This conversation could not be found.');
            setLoading(false);
            return;
        }
        refresh ? setRefreshing(true) : setLoading(true);
        setError('');
        try {
            const result = await getTopic(communityClient, topicId);
            setTopic(result.topic);
            setReplies(result.replies ?? []);
            setReplyPage(1);
            setReplyPages(result.replies_pages ?? 0);
        } catch (loadError) {
            setError(communityError(loadError).message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void load();
    }, [communityClient, topicId]);

    const loadMore = async () => {
        if (loadingMore || replyPage >= replyPages) return;
        setLoadingMore(true);
        setError('');
        try {
            const result = await listReplies(communityClient, topicId, replyPage + 1);
            setReplies((current) => mergeReplies(current, result.replies));
            setReplyPage(result.page);
            setReplyPages(result.pages);
        } catch (loadError) {
            setError(communityError(loadError).message);
        } finally {
            setLoadingMore(false);
        }
    };

    const sendReply = async () => {
        const content = draft.trim();
        if (!content || sending || !topic || topic.status === 'closed' || !user) return;
        setSending(true);
        setError('');
        setNotice('');
        try {
            const result = await createReply(communityClient, topic.topic_id, content);
            const created: Reply = {
                reply_id: result.reply_id,
                topic_id: result.topic_id,
                forum_id: result.forum_id,
                author_id: result.author_id,
                author_name: user.display_name,
                content,
                status: 'publish',
                date: new Date().toISOString(),
                reply_to: 0,
                url: result.url,
                public_voice: result.public_voice,
            };
            setReplies((current) => mergeReplies(current, [created]));
            setTopic((current) => current ? { ...current, reply_count: current.reply_count + 1 } : current);
            setDraft('');
            setNotice('Your reply is live here and on the Community website.');
        } catch (sendError) {
            setError(communityError(sendError).message);
        } finally {
            setSending(false);
        }
    };

    const upvote = async (postId: number, type: 'topic' | 'reply') => {
        setError('');
        try {
            const result = await toggleUpvote(communityClient, postId, type);
            if (type === 'topic') {
                setTopic((current) => current ? { ...current, upvote_count: result.new_count } : current);
            } else {
                setReplies((current) => current.map((reply) => reply.reply_id === postId
                    ? { ...reply, upvote_count: result.new_count, upvoted: result.upvoted }
                    : reply));
            }
            setNotice(result.message);
        } catch (upvoteError) {
            setError(communityError(upvoteError).message);
        }
    };

    return (
        <SafeAreaView style={[communityStyles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
            <CommunityHeader title={topic?.title || 'Conversation'} leadingLabel="Back" onLeadingPress={() => router.back()} />
            {loading ? <StatePanel loading message="Loading conversation..." /> : error && !topic ? (
                <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} />
            ) : topic ? (
                <KeyboardAvoidingView style={communityStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        contentContainerStyle={communityStyles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />}
                    >
                        <View style={[communityStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <View style={communityStyles.rowBetween}>
                                <Text style={[styles.topicTitle, communityStyles.grow, { color: theme.colors.text }]}>{topic.title}</Text>
                                {topic.status === 'closed' ? <Text style={{ color: theme.colors.error }}>Closed</Text> : null}
                            </View>
                            <IdentityLine authorName={topic.author_name} date={topic.date} voice={topic.public_voice} />
                            <Text selectable style={[communityStyles.body, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{plainText(topic.content)}</Text>
                            <View style={communityStyles.rowBetween}>
                                <Pressable onPress={() => void upvote(topic.topic_id, 'topic')} accessibilityRole="button" style={styles.upvote}>
                                    <Text style={{ color: theme.colors.primary }}>Upvote{topic.upvote_count ? ` · ${topic.upvote_count}` : ''}</Text>
                                </Pressable>
                                <CanonicalButton onPress={() => void handle(topic.url)} />
                            </View>
                        </View>

                        {replies.length === 0 ? <Text style={[communityStyles.body, { color: theme.colors.textMuted }]}>No replies yet. Start the conversation.</Text> : null}
                        {replies.map((reply) => (
                            <View key={reply.reply_id} style={[communityStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                                <IdentityLine authorName={reply.author_name} date={reply.date} voice={reply.public_voice} />
                                <Text selectable style={[communityStyles.body, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{plainText(reply.content)}</Text>
                                <View style={communityStyles.rowBetween}>
                                    <Pressable onPress={() => void upvote(reply.reply_id, 'reply')} accessibilityRole="button" style={styles.upvote}>
                                        <Text style={{ color: theme.colors.primary }}>{reply.upvoted ? 'Upvoted' : 'Upvote'}{reply.upvote_count ? ` · ${reply.upvote_count}` : ''}</Text>
                                    </Pressable>
                                    <CanonicalButton onPress={() => void handle(reply.url)} />
                                </View>
                            </View>
                        ))}
                        {replyPage < replyPages ? (
                            <Pressable onPress={() => void loadMore()} disabled={loadingMore} style={[communityStyles.button, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                                <Text style={{ color: theme.colors.primary }}>{loadingMore ? 'Loading...' : 'Load more replies'}</Text>
                            </Pressable>
                        ) : null}
                        {error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{error}</Text> : null}
                        {notice ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.success }}>{notice}</Text> : null}
                    </ScrollView>

                    <View style={[styles.composer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
                        {topic.status === 'closed' ? (
                            <Text style={[communityStyles.body, { color: theme.colors.textMuted }]}>This topic is closed. Existing posts remain readable.</Text>
                        ) : (
                            <>
                                <TextInput
                                    value={draft}
                                    onChangeText={setDraft}
                                    placeholder="Write a reply"
                                    placeholderTextColor={theme.colors.textMuted}
                                    multiline
                                    editable={!sending}
                                    accessibilityLabel="Reply text"
                                    style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, fontFamily: theme.typography.fontFamily }]}
                                />
                                <Pressable
                                    onPress={() => void sendReply()}
                                    disabled={!draft.trim() || sending}
                                    accessibilityRole="button"
                                    style={[communityStyles.button, { backgroundColor: theme.colors.primary, opacity: !draft.trim() || sending ? 0.5 : 1 }]}
                                >
                                    <Text style={{ color: theme.colors.onPrimary }}>{sending ? 'Posting...' : 'Reply'}</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    topicTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
    upvote: { minHeight: 40, justifyContent: 'center' },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, padding: 12 },
    input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
