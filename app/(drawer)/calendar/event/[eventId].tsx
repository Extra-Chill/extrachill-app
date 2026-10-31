import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { cachedEvent, EVENTS_REST_ROOT, getEvent, getAttendance, toggleGoing } from '../../../../src/events/client';
import { eventTime, safeLink, validEventId, mergeEvent, eventError, type CalendarEvent } from '../../../../src/events/model';
import { CanonicalButton, CommunityHeader, StatePanel, communityStyles as styles } from '../../../../src/community/components';
import { ShowRating, useShowRatings } from '../../../../src/show-ratings/components';
import { canRateShow } from '../../../../src/show-ratings/model';
import { communityError, plainText } from '../../../../src/community/model';
import { venueIdentifier } from '../../../../src/venues/model';

export default function EventDetail() {
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const id = validEventId(eventId) ? Number(eventId) : 0;
    const [detail, setDetail] = useState<{ id: number; event: CalendarEvent | null; loading: boolean; error: ReturnType<typeof eventError> | null } | null>(null);
    const currentDetail = detail?.id === id ? detail : null;
    const event = currentDetail ? currentDetail.event : cachedEvent(id);
    const detailLoading = currentDetail ? currentDetail.loading : Boolean(id);
    const { client, user } = useAuth();
    const { handle } = useBrowserHandoff();
    const router = useRouter();
    const theme = useTheme();
    const eventsClient = useMemo(() => client.derive(EVENTS_REST_ROOT), [client]);
    const [attendance, setAttendance] = useState<{ count: number; user_marked: boolean; timing: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [ratingRevision, setRatingRevision] = useState(0);
    const eligible = Boolean(user && canRateShow(attendance?.timing, attendance?.user_marked ?? false));
    const ratings = useShowRatings(client, eligible ? [id] : [], user?.id, ratingRevision);
    const detailRequest = useRef(0);
    const loadDetail = async () => {
        const token = ++detailRequest.current;
        if (!id) return;
        const cached = event ?? cachedEvent(id);
        setDetail({ id, event: cached ?? null, loading: true, error: null });
        try {
            // Older servers keep the existing cached-only experience.
            const supported = Boolean(eventsClient.describe('data-machine-events/get-event'));
            const fetched = supported ? await getEvent(eventsClient, id) : null;
            if (token === detailRequest.current) {
                setDetail({ id, event: mergeEvent(cached, fetched), loading: false, error: null });
            }
        } catch (err) {
            if (token === detailRequest.current) {
                const mapped = eventError(err);
                setDetail({ id, event: mapped.kind === 'not-found' ? null : cached ?? null, loading: false, error: mapped });
            }
        }
    };
    useEffect(() => {
        void loadDetail();
        return () => { detailRequest.current++; };
    }, [eventsClient, id]);
    const request = useRef(0);
    const pending = useRef(false);
    const load = async () => {
        if (!event || pending.current) return;
        const token = ++request.current;
        setLoading(true);
        setError('');
        try {
            const result = await getAttendance(eventsClient, id);
            if (token === request.current) setAttendance(result);
        } catch (err) {
            if (token === request.current) setError(communityError(err).message);
        } finally {
            if (token === request.current) setLoading(false);
        }
    };
    useEffect(() => {
        setAttendance(null);
        pending.current = false;
        setSending(false);
        void load();
        return () => { request.current++; };
    }, [eventsClient, id, event?.id, user?.id]);
    const refresh = () => { setRatingRevision(n => n + 1); void loadDetail(); void load(); };
    const toggle = async () => {
        if (pending.current || loading || !attendance || !user) return;
        pending.current = true;
        setSending(true);
        setError('');
        const token = ++request.current;
        try {
            const result = await toggleGoing(eventsClient, id);
            if (token === request.current) setAttendance({ count: result.count, user_marked: result.marked, timing: result.timing });
        } catch (err) {
            if (token === request.current) setError(communityError(err).message);
        } finally {
            if (token === request.current) { pending.current = false; setSending(false); }
        }
    };
    const open = async (url: string) => {
        try { await handle(url); } catch (err) { setError(communityError(err).message); }
    };
    const text = { color: theme.colors.text, fontFamily: theme.typography.fontFamily };
    const ticket = safeLink(event?.ticket_url);
    const permalink = safeLink(event?.permalink);
    const venueId = venueIdentifier(event?.venue);
    return (
        <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <CommunityHeader title="Event" leadingLabel="Back" onLeadingPress={() => router.canGoBack() ? router.back() : router.replace('/calendar')} />
            {!event ? <StatePanel
                loading={detailLoading}
                message={detailLoading ? 'Loading event...' : currentDetail?.error?.message ?? (id ? 'Open this event from Calendar to see its details. Direct event lookup is not yet available.' : "This event isn't available anymore.")}
                actionLabel={detailLoading ? undefined : currentDetail?.error?.kind === 'retry' ? 'Try again' : 'Browse Calendar'}
                onAction={() => currentDetail?.error?.kind === 'retry' ? void loadDetail() : router.replace('/calendar')}
            /> : (
                <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading || detailLoading} onRefresh={refresh} tintColor={theme.colors.primary} />}>
                    <Text style={[styles.cardTitle, text]}>{event.title}</Text>
                    <Text style={[styles.body, text]}>{event.datetime.slice(0, 10)}</Text>
                    <Text style={[styles.body, text]}>{eventTime(event)}</Text>
                    {!event.venue?.timezone ? <Text style={[styles.meta, text]}>Venue-local time; timezone not supplied.</Text> : null}
                    {event.venue ? <Pressable accessibilityRole="button" disabled={!venueId} onPress={() => venueId && router.push({ pathname: '/calendar/venue/[venueId]', params: { venueId } })}>
                        <Text style={[styles.body, text, { color: venueId ? theme.colors.primary : theme.colors.text }]}>{event.venue.name}{event.venue.formatted_address ? `\n${event.venue.formatted_address}` : ''}</Text>
                    </Pressable> : null}
                    {event.performer?.name ? <Text style={[styles.body, text]}>{event.performer.name}</Text> : !event.content_html ? <Text style={[styles.body, text]}>Lineup and full description are available on the event website.</Text> : null}
                    {event.content_html ? <Text style={[styles.body, text]}>{plainText(event.content_html)}</Text> : null}
                    {currentDetail?.error ? <StatePanel message={currentDetail.error.message} actionLabel="Try again" onAction={() => void loadDetail()} /> : null}
                    {ticket ? <CanonicalButton label="Tickets" onPress={() => void open(ticket)} /> : null}
                    {permalink ? <CanonicalButton label="Open event on web" onPress={() => void open(permalink)} /> : null}
                    {attendance ? <Text style={[styles.body, text]}>{attendance.count} going</Text> : null}
                    {user && attendance ? <Pressable accessibilityRole="button" accessibilityState={{ selected: attendance.user_marked, disabled: sending || loading }} disabled={sending || loading} onPress={() => void toggle()} style={[styles.button, { backgroundColor: theme.colors.primary }]}>
                        <Text style={{ color: theme.colors.onPrimary }}>{sending ? 'Saving...' : attendance.user_marked ? 'Going · Tap to undo' : 'Going'}</Text>
                    </Pressable> : !user ? <Text style={[styles.body, text]}>Sign in to mark that you’re going.</Text> : null}
                    {eligible ? <>
                        {ratings.status}
                        <ShowRating title={plainText(event.title)} rating={ratings.ratings[id]} disabled={!ratings.ready || ratings.busy[id] || sending || loading}
                            error={ratings.errors[id]} onPick={star => void ratings.rate(id, star)} />
                    </> : null}
                    {error ? <StatePanel message={error} actionLabel="Refresh attendance" onAction={() => void load()} /> : null}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
