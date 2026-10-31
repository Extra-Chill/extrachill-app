import { useEffect, useState } from 'react';
import { Image, Linking, Platform, ScrollView, Share, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth, useBrowserHandoff, useTheme } from 'wp-native-shell';
import { CommunityHeader, CanonicalButton, StatePanel, communityStyles as styles } from '../../../src/community/components';
import { canReadStories, getStory, type StoryDetail } from '../../../src/stories/client';
import { cleanExcerpt, displayDate, readerDocument, storyError } from '../../../src/stories/model';

export default function Story() {
    const { storyId } = useLocalSearchParams<{ storyId: string }>();
    const id = Number(storyId);
    const router = useRouter();
    const { client } = useAuth();
    const { handle } = useBrowserHandoff();
    const theme = useTheme();
    const [story, setStory] = useState<StoryDetail | null>(null);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        setStory(null);
        setError('');
        setLoading(true);
        if (!Number.isSafeInteger(id) || id < 1 || !canReadStories(client)) {
            setError('This story is not available.');
            setLoading(false);
            return;
        }
        getStory(client, id).then(result => { if (active) setStory(result); })
            .catch(err => { if (active) setError(storyError(err)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [client, id, attempt]);

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
        {loading ? <StatePanel loading message="Loading story..." /> : error ? <StatePanel message={error} actionLabel="Try again" onAction={() => setAttempt(value => value + 1)} /> : story ? <>
            <ScrollView style={{ maxHeight: '45%' }} contentContainerStyle={styles.scrollContent}>
                {story.featured_image ? <Image source={{ uri: story.featured_image.url }} accessibilityLabel={story.featured_image.alt} style={{ width: '100%', aspectRatio: story.featured_image.width > 0 && story.featured_image.height > 0 ? story.featured_image.width / story.featured_image.height : 1.5 }} /> : null}
                <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{cleanExcerpt(story.title)}</Text>
                <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{story.author.name} · {displayDate(story.date)}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(story.terms).flatMap(([taxonomy, terms]) => terms.map(term => <Text key={`${taxonomy}:${term.id}`} style={{ color: theme.colors.textMuted, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}>{cleanExcerpt(term.name)}</Text>))}
                </View>
                <View style={styles.rowBetween}>
                    <CanonicalButton label="Open on extrachill.com" onPress={() => void openUrl(story.url)} />
                    <CanonicalButton label="Share" onPress={() => void share()} />
                </View>
                {actionError ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textMuted }}>{actionError}</Text> : null}
            </ScrollView>
            <WebView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
                source={{ html: readerDocument(story.content_html, theme.colors), baseUrl: 'https://extrachill.com/' }}
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
                    if (request.url === 'about:blank' || request.url === 'https://extrachill.com/') return true;
                    if (request.isTopFrame !== false) void openUrl(request.url);
                    return false;
                }}
                onError={() => setActionError('Unable to display story content. Open it on extrachill.com instead.')}
            />
        </> : null}
    </SafeAreaView>;
}
