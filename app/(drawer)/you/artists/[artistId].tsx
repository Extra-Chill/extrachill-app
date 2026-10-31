import { useCallback, useMemo, useRef, useState } from 'react';
import { Share } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth, useBrowserHandoff } from 'wp-native-shell';
import { Avatar, Button } from '../../../../src/components';
import { SectionHeading, StatePanel } from '../../../../src/community/components';
import { plainText } from '../../../../src/community/model';
import { YouFrame, YouText, useYouAction } from '../../../../src/you/components';
import { youError } from '../../../../src/you/model';
import { ARTIST_REST_ROOT, getArtist, getArtistAnalytics, getLinkPageData, getLinkPageAnalytics, getUserArtists, type Artist, type Analytics, type LinkPageData } from '../../../../src/artists/client';
import { analyticsSummary, artistId, linkPageLinks, linkPageUrl, manageArtistUrl } from '../../../../src/artists/model';

type Data = { artist: Artist; page?: LinkPageData; analytics?: Analytics; detailError: string };
export default function ArtistScreen() {
    const params = useLocalSearchParams<{ artistId: string }>();
    const id = artistId(params.artistId);
    const { client, user } = useAuth();
    const artistClient = useMemo(() => client.derive(ARTIST_REST_ROOT), [client]);
    const { handle } = useBrowserHandoff();
    const action = useYouAction();
    const [data, setData] = useState<Data>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const load = useCallback(async () => {
        const request = ++generation.current;
        setData(undefined); setLoading(true); setError('');
        try {
            if (!id) throw new Error('This artist could not be found.');
            if (!user) throw new Error('Sign in to view your artists.');
            // Profile reads are public; verify membership before loading any owner surface.
            const memberships = await getUserArtists(artistClient, user.id);
            if (!memberships.some((artist) => artist.id === id)) throw new Error('You no longer manage this artist.');
            const artist = await getArtist(artistClient, id);
            const next: Data = { artist, detailError: '' };
            if (artist.link_page_id) {
                const [page, analytics] = await Promise.allSettled([
                    getLinkPageData(artistClient, id),
                    getArtistAnalytics(artistClient, id).catch(() => getLinkPageAnalytics(artistClient, artist.link_page_id!)),
                ]);
                if (page.status === 'fulfilled') next.page = page.value;
                if (analytics.status === 'fulfilled') next.analytics = analytics.value;
                if (page.status === 'rejected' || analytics.status === 'rejected') next.detailError = 'Some link-page data could not be loaded.';
            }
            if (request === generation.current) setData(next);
        } catch (e) { if (request === generation.current) setError(youError(e)); }
        finally { if (request === generation.current) setLoading(false); }
    }, [artistClient, id, user?.id]);
    useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
    const links = linkPageLinks(data?.page);
    const stats = analyticsSummary(data?.analytics);
    const url = data?.artist.link_page_id ? linkPageUrl(data.artist.slug) : '';
    return <YouFrame title="My Artist" refreshing={loading} onRefresh={() => void load()}>
        {loading ? <StatePanel loading message="Loading artist..." /> : error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} /> : data ? <>
            <Avatar url={data.artist.profile_image_url ?? undefined} size={96} />
            <SectionHeading>{plainText(data.artist.name)}</SectionHeading>
            <YouText>{plainText(data.artist.bio)}</YouText>
            <YouText>{[data.artist.local_city, ...data.artist.genre_labels ?? []].filter(Boolean).join(' · ')}</YouText>
            <Button onPress={() => void action.run(() => handle(manageArtistUrl(data.artist.id)), '')}>Edit on the web</Button>
            {action.message ? <YouText>{action.message}</YouText> : null}
            {data.detailError ? <StatePanel message={data.detailError} actionLabel="Try again" onAction={() => void load()} /> : null}
            <SectionHeading>Link page</SectionHeading>
            {!data.artist.link_page_id ? <YouText>No link page yet.</YouText> : <>
                {url ? <>
                    <Button variant="tertiary" onPress={() => void action.run(() => handle(url), '')}>{url}</Button>
                    <Button variant="tertiary" onPress={() => void action.run(() => Share.share({ message: url, url }), '')}>Share link page</Button>
                </> : null}
                {data.page && !links.length ? <YouText>No links yet.</YouText> : null}
                {links.map((link, index) => <Button key={`${link.url}:${index}`} variant="tertiary" onPress={() => void action.run(() => handle(link.url), '')}>{link.label}</Button>)}
                <SectionHeading>Last 30 days</SectionHeading>
                <YouText>Private analytics for your artist. Updated daily.</YouText>
                {data.analytics ? <>
                    <YouText>{`Views: ${stats.views ?? 'Unavailable'} · Clicks: ${stats.clicks ?? 'Unavailable'}`}</YouText>
                    {stats.links.map((link, index) => <YouText key={index}>{`${link.label}: ${link.clicks ?? 'Unavailable'} clicks`}</YouText>)}
                    {!stats.links.length ? <YouText>No link click data yet.</YouText> : null}
                </> : <YouText>Analytics unavailable.</YouText>}
            </>}
        </> : null}
    </YouFrame>;
}
