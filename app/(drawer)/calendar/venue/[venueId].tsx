import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { EVENTS_REST_ROOT } from '../../../../src/events/client';
import { safeLink } from '../../../../src/events/model';
import { listVenueShows, loadVenue } from '../../../../src/venues/client';
import { directionsUrl, venueAddress } from '../../../../src/venues/model';
import { eventTime, mergeDates, type DateGroup } from '../../../../src/events/model';
import { CanonicalButton, CommunityHeader, StatePanel, communityStyles as styles } from '../../../../src/community/components';
import { communityError, plainText } from '../../../../src/community/model';

export default function VenueDetail() {
    const { venueId } = useLocalSearchParams<{ venueId: string }>();
    const { client } = useAuth();
    const eventsClient = useMemo(() => client.derive(EVENTS_REST_ROOT), [client]);
    const router = useRouter();
    const theme = useTheme();
    const { handle } = useBrowserHandoff();
    const [venue, setVenue] = useState<Awaited<ReturnType<typeof loadVenue>> | null>(null);
    const [groups, setGroups] = useState<DateGroup[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [linkError, setLinkError] = useState('');
    const request = useRef(0);
    const load = async () => {
        const token = ++request.current;
        setLoading(true); setError('');
        try {
            if (!venueId?.trim()) throw new Error('Missing venue');
            const loaded = await loadVenue(eventsClient, venueId);
            const shows = await listVenueShows(eventsClient, loaded.slug!, 1);
            if (token === request.current) { setVenue(loaded); setGroups(shows.dates); setPage(1); setHasMore(shows.has_more); }
        } catch (err) { if (token === request.current) setError(communityError(err).message); }
        finally { if (token === request.current) setLoading(false); }
    };
    const loadMore = async () => {
        if (!venue?.slug || loadingMore || !hasMore) return;
        const token = request.current;
        setLoadingMore(true);
        try {
            const next = await listVenueShows(eventsClient, venue.slug, page + 1);
            if (token === request.current) { setGroups(current => mergeDates(current, next.dates)); setPage(page + 1); setHasMore(next.has_more); }
        } catch (err) { if (token === request.current) setError(communityError(err).message); }
        finally { if (token === request.current) setLoadingMore(false); }
    };
    useEffect(() => {
        setVenue(null); setGroups([]); setLinkError(''); void load();
        return () => { request.current++; };
    }, [eventsClient, venueId]);
    const open = async (url: string, maps = false) => {
        setLinkError('');
        try { if (maps) await Linking.openURL(url); else await handle(url); }
        catch { setLinkError('Could not open this link. Please try again.'); }
    };
    const text = { color: theme.colors.text, fontFamily: theme.typography.fontFamily };
    const website = safeLink(venue?.website);
    return <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CommunityHeader title="Venue" leadingLabel="Back" onLeadingPress={() => router.canGoBack() ? router.back() : router.replace('/calendar')} />
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={theme.colors.primary} />}>
            {venue ? <>
                <Text style={[styles.cardTitle, text]}>{plainText(venue.name)}</Text>
                {venueAddress(venue) ? <Text style={[styles.body, text]}>{venueAddress(venue)}</Text> : null}
                <CanonicalButton label="Directions" onPress={() => void open(directionsUrl(venue, Platform.OS), true)} />
                {website ? <CanonicalButton label="Website" onPress={() => void open(website)} /> : null}
                {venue.description ? <Text style={[styles.body, text]}>{plainText(venue.description)}</Text> : null}
                <Text style={[styles.cardTitle, text]}>Upcoming shows</Text>
                {groups.map(group => <View key={group.date}>
                    <Text style={[styles.meta, text]}>{group.label}</Text>
                    {group.events.map(event => <Pressable key={event.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/calendar/event/[eventId]', params: { eventId: String(event.id) } })} style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.cardTitle, text]}>{plainText(event.title)}</Text>
                        <Text style={[styles.body, text]}>{eventTime(event)}</Text>
                    </Pressable>)}
                </View>)}
                {!groups.length && !loading ? <StatePanel message="No upcoming shows listed for this venue." /> : null}
                {hasMore ? <CanonicalButton label={loadingMore ? 'Loading...' : 'More shows'} onPress={() => void loadMore()} /> : null}
            </> : loading ? <StatePanel loading message="Loading venue..." /> : null}
            {error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} /> : null}
            {linkError ? <Text accessibilityRole="alert" style={text}>{linkError}</Text> : null}
        </ScrollView>
    </SafeAreaView>;
}
