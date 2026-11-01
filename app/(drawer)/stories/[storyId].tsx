import { useSiteClient } from '../../../src/network/site-client';
import { useEffect, useState } from 'react';
import { Image, Linking, Platform, ScrollView, Share, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { CommunityHeader, CanonicalButton, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { getStory, WIRE_REST_ROOT, type StoryDetail } from '../../../src/stories/client';
import { cleanExcerpt, displayDate, readerDocument, storyError, storySource } from '../../../src/stories/model';

export default function Story() {
    const { storyId, source, host } = useLocalSearchParams<{ storyId: string; source?: string | string[]; host?: string | string[] }>();
    const id = Number(storyId);
    const router = useRouter();
    const { client } = useAuth();
    const selectedSource = storySource(source, host);
    const wire = useSiteClient(WIRE_REST_ROOT);
    const storyClient = selectedSource === 'wire' ? wire.client : client;
    // The wire client discovers its catalog asynchronously; the main client is discovered by the shell.
    const ready = selectedSource === 'wire' ? wire.ready : true;
    const discoveryError = selectedSource === 'wire' ? wire.error : undefined;
    const siteRoot = selectedSource === 'wire' ? 'https://wire.extrachill.com/' : 'https://extrachill.com/';
    const siteName = selectedSource === 'wire' ? 'Festival Wire' : 'extrachill.com';
    const { handle } = useBrowserHandoff();
    const theme = useTheme();
    const [story, setStory] = useState<StoryDetail | null>(null);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        if (!ready) {
            setStory(null);
            if (discoveryError) { setError(storyError(discoveryError)); setLoading(false); } else { setError(''); setLoading(true); }
            return;
        }
        setStory(null);
        setError('');
        setLoading(true);
        if (!Number.isSafeInteger(id) || id < 1 || !storyClient.describe('extrachill/get-story')) {
            setError('This story is not available.');
            setLoading(false);
            return;
        }
        getStory(storyClient, id).then(result => { if (active) setStory(result); })
            .catch(err => { if (active) setError(storyError(err)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [storyClient, id, attempt, ready, discoveryError]);

    async function openUrl(url: string) {
        if (!/^https?:\/\//i.test(url)) return;
        try {
            setActionError('');
            if (!await handle(url)) await Linking.openURL(url);
        } catch { setActionError('Unable to open this link.'); }
    }
    async function share() {
        if (!story) return;
        try {
            setActionError('');
            await Share.share(Platform.OS === 'ios' ? { url: story.url, title: cleanExcerpt(story.title) } : { message: story.url, title: cleanExcerpt(story.title) });
        } catch { setActionError('Unable to share this story.'); }
    }

    return <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title="Story" leadingLabel="Back" onLeadingPress={() => router.canGoBack() ? router.back() : router.replace('/stories')} />
        {loading ? <StatePanel loading message="Loading story..." /> : error ? <StatePanel message={error} actionLabel="Try again" onAction={() => { if (discoveryError) wire.retry(); setAttempt(value => value + 1); }} /> : story ? <>
            <ScrollView style={{ maxHeight: '45%' }} contentContainerStyle={styles.scrollContent}>
                {story.featured_image ? <Image source={{ uri: story.featured_image.url }} accessibilityLabel={story.featured_image.alt} style={{ width: '100%', aspectRatio: story.featured_image.width > 0 && story.featured_image.height > 0 ? story.featured_image.width / story.featured_image.height : 1.5 }} /> : null}
                <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{cleanExcerpt(story.title)}</Text>
                <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{story.author.name} · {displayDate(story.date)}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(story.terms).flatMap(([taxonomy, terms]) => terms.map(term => <Text key={`${taxonomy}:${term.id}`} style={{ color: theme.colors.textMuted, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}>{cleanExcerpt(term.name)}</Text>))}
                </View>
                <View style={styles.rowBetween}>
                    <CanonicalButton label={`Open on ${siteName}`} onPress={() => void openUrl(story.url)} />
                    <CanonicalButton label="Share" onPress={() => void share()} />
                </View>
                {actionError ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textMuted }}>{actionError}</Text> : null}
            </ScrollView>
            <WebView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
                source={{ html: readerDocument(story.content_html, theme.colors), baseUrl: siteRoot }}
                originWhitelist={['*']}
                javaScriptEnabled={false}
                domStorageEnabled={false}
                sharedCookiesEnabled={false}
                thirdPartyCookiesEnabled={false}
                allowFileAccess={false}
                allowsLinkPreview={false}
                mixedContentMode="never"
                setSupportMultipleWindows={false}
                onShouldStartLoadWithRequest={request => {
                    if (request.url === 'about:blank' || request.url === siteRoot) return true;
                    if (request.isTopFrame !== false) void openUrl(request.url);
                    return false;
                }}
                onError={() => setActionError(`Unable to display story content. Open it on ${siteName} instead.`)}
            />
        </> : null}
    </SafeAreaView>;
}
