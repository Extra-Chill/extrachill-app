import { useSiteClient } from '../../../src/network/site-client';
import { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { Avatar } from '../../../src/components';
import { CommunityHeader, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { COMMUNITY_REST_ROOT } from '../../../src/community/client';
import { communityError, plainText } from '../../../src/community/model';
import { ModerationActions } from '../../../src/community/ModerationActions';
import { getMemberProfile, type MemberProfile } from '../../../src/members/client';
import { memberId } from '../../../src/members/model';
import { MemberDiscussions } from '../../../src/members/MemberDiscussions';
import { safeLinks } from '../../../src/you/model';

export default function MemberProfileScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const id = memberId(userId);
    const { client, user } = useAuth();
    const theme = useTheme();
    const router = useRouter();
    const { handle } = useBrowserHandoff();
    const { client: moderationClient, ready } = useSiteClient(COMMUNITY_REST_ROOT);
    const [profile, setProfile] = useState<MemberProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const load = async (pull = false) => {
        const request = ++generation.current;
        pull ? setRefreshing(true) : setLoading(true);
        setError('');
        try {
            if (!id) throw new Error('This member could not be found.');
            const result = await getMemberProfile(client, id);
            if (request === generation.current) setProfile(result);
        } catch (err) { if (request === generation.current) setError(communityError(err).message); }
        finally { if (request === generation.current) { setLoading(false); setRefreshing(false); } }
    };
    useEffect(() => { setProfile(null); void load(); return () => { generation.current++; }; }, [client, id]);
    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title="Member profile" leadingLabel="Back" onLeadingPress={() => router.back()} />
        {loading ? <StatePanel loading message="Loading member..." /> : <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
            {error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} /> : null}
            {profile ? <>
                <Avatar url={profile.avatar_url} size={80} />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{profile.display_name}</Text>
                {[profile.custom_title, profile.local_city, profile.bio].filter(Boolean).map((text, index) => <Text key={index} style={[styles.body, { color: theme.colors.text }]}>{plainText(text)}</Text>)}
                {safeLinks(profile.links).map((link, index) => <Pressable key={index} accessibilityRole="link" onPress={() => void handle(link.url)} style={styles.button}><Text style={{ color: theme.colors.primary }}>{link.custom_label || link.type_key || link.url}</Text></Pressable>)}
                {id === user?.id ? <Pressable accessibilityRole="link" onPress={() => router.push('/you')} style={styles.button}><Text style={{ color: theme.colors.primary }}>Manage your profile in You</Text></Pressable> : id ? <ModerationActions ready={ready} client={moderationClient} authorId={id} authorName={profile.display_name} onBlocked={async () => router.back()} /> : null}
                {id ? <MemberDiscussions client={moderationClient} ready={ready} authorId={id} refreshKey={generation.current} /> : null}
            </> : null}
        </ScrollView>}
    </SafeAreaView>;
}
