import { useSiteClient } from '../../../src/network/site-client';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import { COMMUNITY_REST_ROOT } from '../../../src/community/client';
import { CommunityHeader, StatePanel, communityStyles } from '../../../src/community/components';
import { listBlockedMembers, moderationAvailable, unblockMember } from '../../../src/community/moderation-client';
import type { BlockedMember } from '../../../src/community/moderation-client';

export default function BlockedMembers() {
    const { client, user } = useAuth();
    const router = useRouter();
    const theme = useTheme();
    const { client: communityClient, ready, error: discoveryError, retry } = useSiteClient(COMMUNITY_REST_ROOT);
    const available = moderationAvailable(communityClient, ready);
    const [members, setMembers] = useState<BlockedMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState('');
    const load = async (refresh = false) => {
        if (!ready) return;
        if (!available.list || !user) { setLoading(false); return; }
        refresh ? setRefreshing(true) : setLoading(true);
        setError('');
        try { setMembers((await listBlockedMembers(communityClient)).users); }
        catch { setError('Could not load blocked members. Please try again.'); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { void load(); }, [communityClient, user, ready]);
    const unblock = async (id: number) => {
        if (busy !== null) return;
        setBusy(id);
        setError('');
        try {
            await unblockMember(communityClient, id);
            await load(true);
        } catch { setError('Could not unblock this member. Please try again.'); }
        finally { setBusy(null); }
    };
    return <SafeAreaView style={[communityStyles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title="Blocked members" leadingLabel="Back" onLeadingPress={() => router.back()} />
        {discoveryError ? <StatePanel message="Could not load community features." actionLabel="Try again" onAction={retry} /> : !ready ? <StatePanel loading message="Loading community features..." /> : !available.list || !user ? <StatePanel message="Blocked members are not available right now." /> : loading ? <StatePanel loading message="Loading blocked members..." /> : error && members.length === 0 ? (
            <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} />
        ) : <FlatList
            data={members}
            keyExtractor={(item) => String(item.user_id)}
            contentContainerStyle={communityStyles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />}
            ListHeaderComponent={error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{error}</Text> : null}
            ListEmptyComponent={<StatePanel message="You haven't blocked any members." />}
            renderItem={({ item }) => <View style={[communityStyles.card, communityStyles.rowBetween, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[communityStyles.grow, { color: theme.colors.text }]}>{item.display_name}</Text>
                {available.unblock ? <Pressable accessibilityRole="button" accessibilityLabel={`Unblock ${item.display_name}`} disabled={busy !== null} style={communityStyles.button} onPress={() => void unblock(item.user_id)}>
                    <Text style={{ color: theme.colors.primary }}>{busy === item.user_id ? 'Unblocking…' : 'Unblock'}</Text>
                </Pressable> : null}
            </View>}
        />}
    </SafeAreaView>;
}
