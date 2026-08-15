import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { COMMUNITY_REST_ROOT, listForums, recentActivity } from '../../../src/community/client';
import { CommunityHeader, SectionHeading, StatePanel, communityStyles } from '../../../src/community/components';
import { communityError, displayDate, forumRows } from '../../../src/community/model';
import type { ActivityItem, Forum } from '../../../src/community/types';

export default function CommunityHome() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const router = useRouter();
    const { client } = useAuth();
    const { handle } = useBrowserHandoff();
    const theme = useTheme();
    const communityClient = useMemo(() => client.derive(COMMUNITY_REST_ROOT), [client]);
    const [forums, setForums] = useState<Forum[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = async (refresh = false) => {
        refresh ? setRefreshing(true) : setLoading(true);
        setError('');
        try {
            const [forumResult, activityResult] = await Promise.all([
                listForums(communityClient),
                recentActivity(communityClient),
            ]);
            setForums(forumResult.forums);
            setActivity(activityResult.items);
        } catch (loadError) {
            setError(communityError(loadError).message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void load();
    }, [communityClient]);

    return (
        <SafeAreaView style={[communityStyles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
            <CommunityHeader title="Community" subtitle="Recent conversations and rooms" onLeadingPress={() => navigation.openDrawer()} />
            {loading ? <StatePanel loading message="Loading Community..." /> : error ? (
                <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} />
            ) : (
                <ScrollView
                    contentContainerStyle={communityStyles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />}
                >
                    <SectionHeading>What's happening</SectionHeading>
                    {activity.length === 0 ? (
                        <Text style={[communityStyles.body, { color: theme.colors.textMuted }]}>No public activity yet.</Text>
                    ) : activity.map((item) => (
                        <Pressable
                            key={`${item.activity_type}:${item.canonical_url}`}
                            onPress={() => void handle(item.canonical_url)}
                            accessibilityRole="link"
                            style={[communityStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                        >
                            <Text style={[communityStyles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamilyBold ?? theme.typography.fontFamily }]}>{item.title}</Text>
                            <Text style={[communityStyles.meta, { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }]}>
                                {item.actor.display_name} {item.activity_type === 'reply' ? 'replied' : 'started a discussion'} in {item.relationships.forum.name}
                            </Text>
                            <Text style={[communityStyles.meta, { color: theme.colors.textMuted }]}>{displayDate(item.timestamp)}</Text>
                        </Pressable>
                    ))}

                    <SectionHeading>Browse rooms</SectionHeading>
                    {forums.length === 0 ? <Text style={[communityStyles.body, { color: theme.colors.textMuted }]}>No rooms are available to your account.</Text> : null}
                    {forumRows(forums).map((forum) => (
                        <Pressable
                            key={forum.forum_id}
                            onPress={() => router.push({ pathname: '/community/forum/[forumId]', params: { forumId: String(forum.forum_id), title: forum.title, url: forum.url } })}
                            accessibilityRole="button"
                            style={[
                                communityStyles.card,
                                { marginLeft: Math.min(forum.depth, 2) * 14, backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                            ]}
                        >
                            <View style={communityStyles.rowBetween}>
                                <Text style={[communityStyles.cardTitle, communityStyles.grow, { color: theme.colors.text }]}>{forum.title}</Text>
                                <Text style={[communityStyles.meta, { color: theme.colors.textMuted }]}>{forum.topic_count} topics</Text>
                            </View>
                            <Text style={[communityStyles.meta, { color: theme.colors.textMuted }]}>{forum.reply_count} replies</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
