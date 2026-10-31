import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import { defaultLocation, EVENTS_REST_ROOT } from '../../../src/events/client';
import { listVenues } from '../../../src/venues/client';
import { browseVenues, marketCoordinates, type VenueSummary } from '../../../src/venues/model';
import { CommunityHeader, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { communityError, plainText } from '../../../src/community/model';

export default function Venues() {
    const { market, lat, lng } = useLocalSearchParams<{ market?: string; lat?: string; lng?: string }>();
    const { client } = useAuth();
    const eventsClient = useMemo(() => client.derive(EVENTS_REST_ROOT), [client]);
    const theme = useTheme();
    const router = useRouter();
    const [venues, setVenues] = useState<VenueSummary[]>([]);
    const [search, setSearch] = useState('');
    const [marketName, setMarketName] = useState('');
    const [proximity, setProximity] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const request = useRef(0);
    const load = async () => {
        const token = ++request.current;
        setLoading(true); setError('');
        try {
            const location = market !== undefined ? { name: market, lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined } : await defaultLocation(client);
            const coordinates = marketCoordinates(location);
            const result = await listVenues(eventsClient, coordinates);
            if (token === request.current) { setVenues(result.venues); setMarketName(location?.name || ''); setProximity(Boolean(coordinates)); }
        } catch (err) { if (token === request.current) setError(communityError(err).message); }
        finally { if (token === request.current) setLoading(false); }
    };
    useEffect(() => { setVenues([]); void load(); return () => { request.current++; }; }, [eventsClient, client, market, lat, lng]);
    const text = { color: theme.colors.text, fontFamily: theme.typography.fontFamily };
    return <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CommunityHeader title="Venues near you" leadingLabel="Back" onLeadingPress={() => router.canGoBack() ? router.back() : router.replace('/calendar')} />
        <FlatList data={loading ? [] : browseVenues(venues, search, proximity)} keyExtractor={item => String(item.term_id)} contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={theme.colors.primary} />}
            ListHeaderComponent={<>
                <Text style={[styles.body, text]}>{proximity ? `Within 25 miles of ${marketName}, by distance.` : `${marketName ? `Your market: ${marketName}. ` : ''}Search venues by name or address. Listed alphabetically; proximity is unavailable without market coordinates.`}</Text>
                <TextInput accessibilityLabel="Search venues by name or address" placeholder="Search venues" placeholderTextColor={theme.colors.textMuted} value={search} onChangeText={setSearch} style={[styles.card, text, { borderColor: theme.colors.border }]} />
            </>}
            renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/calendar/venue/[venueId]', params: { venueId: String(item.term_id) } })} style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: 8 }]}>
                <Text style={[styles.cardTitle, text]}>{plainText(item.name)}</Text>
                {item.address ? <Text style={[styles.body, text]}>{item.address}</Text> : null}
                {proximity && item.distance != null ? <Text style={[styles.meta, text]}>{item.distance.toFixed(1)} mi away</Text> : null}
            </Pressable>}
            ListEmptyComponent={loading ? <StatePanel loading message="Loading venues..." /> : !error ? <StatePanel message="No venues found. Try another name or address." /> : null}
            ListFooterComponent={error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} /> : null}
        />
    </SafeAreaView>;
}
