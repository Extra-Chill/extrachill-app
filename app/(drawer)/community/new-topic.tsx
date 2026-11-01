import { useSiteClient } from '../../../src/network/site-client';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput as NativeTextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import { Button, TextInput } from '../../../src/components';
import { COMMUNITY_REST_ROOT, createTopic, listForums } from '../../../src/community/client';
import { CommunityHeader, SectionHeading, StatePanel, communityStyles } from '../../../src/community/components';
import { communityError, forumRows, topicForums, validateNewTopic } from '../../../src/community/model';
import type { Forum } from '../../../src/community/types';

export default function NewTopic() {
    const params = useLocalSearchParams<{ forumId?: string }>();
    const router = useRouter();
    const { client, user } = useAuth();
    const theme = useTheme();
    const { client: communityClient } = useSiteClient(COMMUNITY_REST_ROOT);
    const [forums, setForums] = useState<Forum[]>([]);
    const [forumId, setForumId] = useState(Number(params.forumId) || 0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const posting = useRef(false);
    const [errors, setErrors] = useState<ReturnType<typeof validateNewTopic>>({});

    const load = async (refresh = false) => {
        refresh ? setRefreshing(true) : setLoading(true);
        setLoadError('');
        try {
            // Include rooms outside the archive when choosing a destination.
            const result = await listForums(communityClient, false);
            setForums(topicForums(result.forums));
        } catch (loadFailure) {
            setLoadError(communityError(loadFailure).message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { void load(); }, [communityClient]);

    const submit = async () => {
        if (posting.current || loading || refreshing || loadError) return;
        const validation = validateNewTopic(forumId, title, content);
        if (!forums.some((forum) => forum.forum_id === forumId)) validation.forum = 'Choose an available room.';
        setErrors(validation);
        setError('');
        if (Object.keys(validation).length) return;
        if (!user) {
            setError('Sign in to start a topic.');
            return;
        }
        posting.current = true;
        setSending(true);
        try {
            const result = await createTopic(communityClient, forumId, title, content);
            router.replace({ pathname: '/community/topic/[topicId]', params: { topicId: String(result.topic_id) } });
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'Your topic could not be posted. Try again.');
        } finally {
            posting.current = false;
            setSending(false);
        }
    };

    return (
        <SafeAreaView style={[communityStyles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
            <CommunityHeader title="New topic" leadingLabel="Back" onLeadingPress={() => { if (!sending) router.back(); }} />
            {loading ? <StatePanel loading message="Loading rooms..." /> : loadError ? (
                <StatePanel message={loadError} actionLabel="Try again" onAction={() => void load()} />
            ) : (
                <KeyboardAvoidingView style={communityStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        contentContainerStyle={communityStyles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={<RefreshControl refreshing={refreshing} enabled={!sending} onRefresh={() => { if (!posting.current) void load(true); }} tintColor={theme.colors.primary} />}
                    >
                        <SectionHeading>Room</SectionHeading>
                        {forums.length === 0 ? <Text style={{ color: theme.colors.textMuted }}>No rooms are accepting new topics.</Text> : null}
                        {forumRows(forums).map((forum) => (
                            <Pressable
                                key={forum.forum_id}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: forumId === forum.forum_id, disabled: sending }}
                                disabled={sending}
                                onPress={() => setForumId(forum.forum_id)}
                                style={[communityStyles.card, { marginLeft: Math.min(forum.depth, 2) * 14, backgroundColor: theme.colors.surface, borderColor: forumId === forum.forum_id ? theme.colors.primary : theme.colors.border }]}
                            >
                                <Text style={[communityStyles.cardTitle, { color: theme.colors.text }]}>{forumId === forum.forum_id ? '✓ ' : ''}{forum.title}</Text>
                            </Pressable>
                        ))}
                        {errors.forum ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{errors.forum}</Text> : null}
                        <TextInput label="Title" accessibilityLabel="Topic title" value={title} onChangeText={setTitle} editable={!sending} error={errors.title} />
                        <View style={{ gap: 6 }}>
                            <Text style={[communityStyles.body, { color: theme.colors.text }]}>Body (plain text)</Text>
                            <NativeTextInput
                                accessibilityLabel="Topic body"
                                value={content}
                                onChangeText={setContent}
                                editable={!sending}
                                multiline
                                textAlignVertical="top"
                                placeholder="Start the conversation"
                                placeholderTextColor={theme.colors.textMuted}
                                style={{ minHeight: 180, borderWidth: 1, borderRadius: theme.radii.md, padding: 12, color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: errors.content ? theme.colors.error : theme.colors.border, fontFamily: theme.typography.fontFamily, fontSize: 16 }}
                            />
                            {errors.content ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{errors.content}</Text> : null}
                        </View>
                        {error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{error}</Text> : null}
                        <Button onPress={() => void submit()} loading={sending} disabled={refreshing || forums.length === 0}>Post topic</Button>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
