import { useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import type { WPNativeClient } from 'wp-native-client';
import { useTheme } from 'wp-native-shell';
import { listMemberTopics } from '../community/client';
import { SectionHeading, StatePanel, communityStyles as styles } from '../community/components';
import { communityError, displayDate, plainText } from '../community/model';
import { memberTopicsPage, supportsAuthorTopics, type MemberTopicsPage } from './model';

const emptyPage: MemberTopicsPage = { topics: [], page: 0, hasMore: false };

export function MemberDiscussions({ client, ready, authorId, refreshKey }: { client: WPNativeClient; ready: boolean; authorId: number; refreshKey: number }) {
    const theme = useTheme();
    const router = useRouter();
    // Site clients discover their catalog asynchronously; only decide once ready.
    const supported = ready && supportsAuthorTopics(client.describe('extrachill/community-list-topics'));
    const [result, setResult] = useState(emptyPage);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const busy = useRef(false);

    const load = async (page: number) => {
        if (busy.current) return;
        const request = generation.current;
        busy.current = true;
        setLoading(true);
        setError('');
        try {
            const response = await listMemberTopics(client, authorId, page);
            if (request === generation.current) setResult(current => memberTopicsPage(page === 1 ? [] : current.topics, response));
        } catch (err) {
            if (request === generation.current) setError(communityError(err).message);
        } finally {
            if (request === generation.current) { busy.current = false; setLoading(false); }
        }
    };

    useEffect(() => {
        generation.current++;
        busy.current = false;
        setResult(emptyPage);
        setError('');
        setLoading(false);
        if (supported) void load(1);
        return () => { generation.current++; };
    }, [client, authorId, refreshKey, supported]);

    if (!supported || (!loading && !error && result.topics.length === 0)) return null;
    return <>
        <SectionHeading>Discussions</SectionHeading>
        {result.topics.map(topic => <Pressable key={topic.topic_id} accessibilityRole="link" onPress={() => router.push({ pathname: '/community/topic/[topicId]', params: { topicId: String(topic.topic_id) } })} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{plainText(topic.title)}</Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{displayDate(topic.date)}</Text>
        </Pressable>)}
        {loading ? <StatePanel loading message="Loading discussions..." /> : error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load(result.page + 1)} /> : result.hasMore ? <Pressable accessibilityRole="button" onPress={() => void load(result.page + 1)} style={styles.button}><Text style={{ color: theme.colors.primary }}>More</Text></Pressable> : null}
    </>;
}
