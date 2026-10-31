import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, Text, TextInput, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import { EVENTS_REST_ROOT, defaultLocation, listEvents, rememberEvents, searchLocations } from '../../../src/events/client';
import { eventTime, mergeDates, scopes } from '../../../src/events/model';
import type { DateGroup, EventLocation, TimeScope } from '../../../src/events/model';
import { CommunityHeader, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { communityError } from '../../../src/community/model';

export default function Calendar() {
    const { client } = useAuth();
    const theme = useTheme();
    const router = useRouter();
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const eventsClient = useMemo(() => client.derive(EVENTS_REST_ROOT), [client]);
    const [scope, setScope] = useState<TimeScope>('tonight');
    const [location, setLocation] = useState<EventLocation | null>(null);
    const [ready, setReady] = useState(false);
    const [groups, setGroups] = useState<DateGroup[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [preferenceError, setPreferenceError] = useState('');
    const [picker, setPicker] = useState(false);
    const [search, setSearch] = useState('');
    const [locations, setLocations] = useState<EventLocation[]>([]);
    const [locationError, setLocationError] = useState('');
    const [searching, setSearching] = useState(false);
    const generation = useRef(0);
    const busy = useRef(false);

    useEffect(() => {
        let active = true;
        setReady(false);
        setPreferenceError('');
        defaultLocation(client).then(result => {
            if (active) { setLocation(result); setPicker(!result); }
        }).catch(() => {
            if (active) { setLocation(null); setPicker(true); setPreferenceError('Could not load your default location. Showing all locations.'); }
        }).finally(() => { if (active) setReady(true); });
        return () => { active = false; };
    }, [client]);

    const load = async (more = false, refresh = false) => {
        if (!ready || (more && (busy.current || !hasMore))) return;
        const request = more ? generation.current : ++generation.current;
        busy.current = true;
        if (more) setLoadingMore(true);
        else {
            setRefreshing(refresh);
            setLoading(!refresh);
            setLoadingMore(false);
            if (!refresh) { setGroups([]); setPage(0); setHasMore(false); }
        }
        setError('');
        try {
            const result = await listEvents(eventsClient, more ? page + 1 : 1, scope, location?.slug);
            if (request !== generation.current) return;
            rememberEvents(result.dates);
            setGroups(current => mergeDates(more ? current : [], result.dates));
            setPage(result.page);
            setHasMore(result.has_more);
        } catch (err) {
            if (request === generation.current) setError(communityError(err).message);
        } finally {
            if (request === generation.current) { busy.current = false; setLoading(false); setRefreshing(false); setLoadingMore(false); }
        }
    };
    useEffect(() => {
        if (ready) void load();
        return () => { generation.current++; busy.current = false; };
    }, [ready, eventsClient, scope, location?.slug]);

    useEffect(() => {
        if (!picker) return;
        let active = true;
        setSearching(true);
        setLocations([]);
        setLocationError('');
        const timer = setTimeout(() => {
            searchLocations(eventsClient, search).then(result => { if (active) setLocations(result.locations); })
                .catch(err => { if (active) setLocationError(communityError(err).message); })
                .finally(() => { if (active) setSearching(false); });
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [eventsClient, picker, search]);

    const text = { color: theme.colors.text, fontFamily: theme.typography.fontFamily };
    const action = (label: string, onPress: () => void, selected = false) => (
        <Pressable key={label} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.button, { borderWidth: 1, borderColor: selected ? theme.colors.primary : theme.colors.border }]}>
            <Text style={{ ...text, color: theme.colors.primary }}>{label}</Text>
        </Pressable>
    );
    return (
        <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <CommunityHeader title="Calendar" onLeadingPress={() => navigation.openDrawer()} />
            <SectionList
                sections={loading ? [] : groups.map(group => ({ ...group, data: group.events }))}
                keyExtractor={event => String(event.id)}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(false, true)} tintColor={theme.colors.primary} />}
                onEndReached={() => { if (!error) void load(true); }}
                onEndReachedThreshold={0.4}
                ListHeaderComponent={<View style={{ gap: 12 }}>
                    <View style={[styles.row, { flexWrap: 'wrap' }]}>{scopes.map(item => action(item.label, () => setScope(item.value), scope === item.value))}</View>
                    {action(location?.name || 'All locations', () => setPicker(!picker))}
                    {preferenceError ? <Text style={text}>{preferenceError}</Text> : null}
                    {picker ? <View style={{ gap: 8 }}>
                        <TextInput accessibilityLabel="Search event locations" placeholder="Search locations" placeholderTextColor={theme.colors.textMuted} value={search} onChangeText={setSearch} style={[styles.card, text, { borderColor: theme.colors.border }]} />
                        {action('Show all locations', () => { setLocation(null); setPicker(false); })}
                        {searching ? <ActivityIndicator color={theme.colors.primary} /> : locationError ? <Text accessibilityRole="alert" style={text}>{locationError}</Text> : locations.length === 0 ? <Text style={text}>No locations found.</Text> : locations.map(item => action(item.name, () => { setLocation(item); setPicker(false); }))}
                    </View> : null}
                </View>}
                renderSectionHeader={({ section }) => <Text style={[styles.cardTitle, { ...text, backgroundColor: theme.colors.background, paddingVertical: 12 }]}>{section.label}</Text>}
                renderItem={({ item }) => (
                    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/calendar/event/[eventId]', params: { eventId: String(item.id) } })} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
                        <Text style={[styles.cardTitle, text]}>{item.title}</Text>
                        <Text style={[styles.meta, text]}>{eventTime(item)}</Text>
                        {item.venue ? <Text style={[styles.body, text]}>{item.venue.name}</Text> : null}
                    </Pressable>
                )}
                ListEmptyComponent={loading ? <StatePanel loading message="Loading events..." /> : !error ? <StatePanel message="No events in this time and location. Try another filter." /> : null}
                ListFooterComponent={error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load(page > 0 && hasMore && !refreshing)} /> : loadingMore ? <ActivityIndicator color={theme.colors.primary} /> : hasMore && !loading ? action('Load more', () => void load(true)) : null}
            />
        </SafeAreaView>
    );
}
