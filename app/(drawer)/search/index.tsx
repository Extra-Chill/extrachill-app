import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRouter, type Href } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { TextInput } from '../../../src/components';
import { CommunityHeader, SectionHeading, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { plainText } from '../../../src/community/model';
import { searchNetwork } from '../../../src/search/client';
import { groupResults, normalizeQuery, rememberQuery, resultDestination } from '../../../src/search/model';
import type { SearchResult } from '../../../src/search/types';

// Session memory only: deliberately no storage adapter or persistence.
let sessionQueries: string[] = [];

export default function SearchScreen() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const router = useRouter();
    const { client } = useAuth();
    const { handle } = useBrowserHandoff();
    const theme = useTheme();
    const [query, setQuery] = useState('');
    const term = normalizeQuery(query);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [recent, setRecent] = useState(sessionQueries);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let active = true;
        setResults([]);
        setError('');
        setLoading(term.length >= 2);
        if (term.length < 2) return;
        const timer = setTimeout(async () => {
            sessionQueries = rememberQuery(sessionQueries, term);
            setRecent(sessionQueries);
            try {
                const response = await searchNetwork(client, term);
                if (active) setResults(response);
            } catch {
                if (active) setError('Search could not be loaded. Try again.');
            } finally {
                if (active) setLoading(false);
            }
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [client, term, retry]);

    const openResult = async (result: SearchResult) => {
        const destination = resultDestination(result);
        if (destination.kind === 'native') router.push(destination.path as Href);
        if (destination.kind === 'browser') {
            try { await handle(destination.url); }
            catch { setError('This result could not be opened. Try again.'); }
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
            <CommunityHeader title="Search" subtitle="Across the Extra Chill network" onLeadingPress={() => navigation.openDrawer()} />
            <View style={{ padding: 16 }}>
                <TextInput
                    accessibilityLabel="Search Extra Chill"
                    placeholder="Events, venues, artists, topics, stories"
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
            </View>
            {term.length < 2 ? (
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={[styles.body, { color: theme.colors.textMuted }]}>Enter at least 2 characters to search the network.</Text>
                    {recent.length ? <SectionHeading>Recent searches</SectionHeading> : null}
                    {recent.map((item) => (
                        <Pressable key={item} onPress={() => setQuery(item)} accessibilityRole="button" style={styles.button}>
                            <Text style={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamily }}>{item}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            ) : loading ? <StatePanel loading message="Searching the network..." /> : error ? (
                <StatePanel message={error} actionLabel="Try again" onAction={() => setRetry((value) => value + 1)} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={false} onRefresh={() => setRetry((value) => value + 1)} tintColor={theme.colors.primary} />}
                >
                    {results.length === 0 ? <StatePanel message="No results found. Try another search." /> : null}
                    {groupResults(results).map((group) => (
                        <View key={group.key} style={{ gap: 12 }}>
                            <SectionHeading>{plainText(group.title)}</SectionHeading>
                            {group.results.map((result, index) => (
                                <Pressable
                                    key={`${result.ID}:${index}`}
                                    accessibilityRole="link"
                                    disabled={resultDestination(result).kind === 'unavailable'}
                                    onPress={() => void openResult(result)}
                                    style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                >
                                    <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{plainText(result.post_title) || 'Untitled'}</Text>
                                    <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{result.post_type}</Text>
                                    {result.post_excerpt ? <Text numberOfLines={3} style={[styles.body, { color: theme.colors.textMuted }]}>{plainText(result.post_excerpt)}</Text> : null}
                                </Pressable>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
