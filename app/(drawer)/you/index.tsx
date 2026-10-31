import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { useAuth, useBrowserHandoff } from 'wp-native-shell';
import { Avatar, Button } from '../../../src/components';
import { SectionHeading, StatePanel } from '../../../src/community/components';
import { plainText } from '../../../src/community/model';
import { getProfile, getShows, type Profile, type ShowsPage, type Period } from '../../../src/you/client';
import { mergeShows, safeLinks, youError } from '../../../src/you/model';
import { ShowRating, useShowRatings } from '../../../src/show-ratings/components';
import { recentShows } from '../../../src/show-ratings/model';
import { YouFrame, YouText } from '../../../src/you/components';

export default function YouHome() {
    const { client, user } = useAuth();
    const { handle } = useBrowserHandoff();
    const router = useRouter();
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const [profile, setProfile] = useState<Profile>();
    const [period, setPeriod] = useState<Period>('upcoming');
    const [shows, setShows] = useState<ShowsPage>();
    const [loading, setLoading] = useState(true);
    const [more, setMore] = useState(false);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const [ratingRevision, setRatingRevision] = useState(0);
    const ratings = useShowRatings(client, period === 'past' ? shows?.shows.map(show => show.event_id) ?? [] : [], user?.id, ratingRevision);
    const load = useCallback(async () => {
        const request = ++generation.current;
        setRatingRevision(n => n + 1);
        setLoading(true); setError(''); setMore(false); setShows(undefined);
        try {
            if (!user) throw new Error('Sign in to view your profile.');
            const [nextProfile, nextShows] = await Promise.all([getProfile(client, user.id), getShows(client, period)]);
            if (request === generation.current) { setProfile(nextProfile); setShows(nextShows); }
        } catch (e) { if (request === generation.current) setError(youError(e)); }
        finally { if (request === generation.current) setLoading(false); }
    }, [client, user?.id, period]);
    useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
    async function loadMore() {
        if (!shows || more) return;
        const request = generation.current;
        setMore(true); setError('');
        try {
            const next = await getShows(client, period, shows.page + 1);
            if (request === generation.current) setShows({ ...next, shows: mergeShows(shows.shows, next.shows) });
        } catch (e) { if (request === generation.current) setError(youError(e)); }
        finally { if (request === generation.current) setMore(false); }
    }
    return <YouFrame title="You" onLeadingPress={() => navigation.openDrawer()} refreshing={loading} onRefresh={() => void load()}>
        {loading ? <StatePanel loading message="Loading your profile and shows..." /> : <>
            {error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void (shows ? loadMore() : load())} /> : null}
            {profile ? <>
                <Avatar url={profile.avatar_url} size={80} />
                <SectionHeading>{plainText(profile.display_name)}</SectionHeading>
                <YouText>{plainText(profile.custom_title)}</YouText>
                <YouText>{plainText(profile.local_city)}</YouText>
                <YouText>{plainText(profile.bio)}</YouText>
                {safeLinks(profile.links).map((link, index) => <Button key={`${link.url}:${index}`} variant="tertiary" onPress={() => void handle(link.url)}>{link.custom_label || link.type_key || link.url}</Button>)}
            </> : null}
            <Button onPress={() => router.push('/you/edit')}>Edit profile</Button>
            <Button variant="tertiary" onPress={() => router.push('/you/settings')}>Account settings</Button>
            <SectionHeading>My Shows</SectionHeading>
            <Button variant={period === 'upcoming' ? 'primary' : 'tertiary'} onPress={() => setPeriod('upcoming')}>Upcoming</Button>
            <Button variant={period === 'past' ? 'primary' : 'tertiary'} onPress={() => setPeriod('past')}>Past</Button>
            {shows?.shows.length === 0 ? <YouText>{`No ${period} shows yet.`}</YouText> : null}
            {period === 'past' && shows?.shows.length ? <>
                <SectionHeading>Rate your recent shows</SectionHeading>
                <YouText>Only you can see your ratings. Tap the selected star again to clear.</YouText>
                {ratings.status}
                {ratings.ready ? recentShows(shows.shows, ratings.ratings).filter(show => !ratings.ratings[show.event_id]).slice(0, 5).map(show => <View key={show.event_id}>
                    <Button variant="tertiary" onPress={() => router.push(`/calendar/event/${show.event_id}`)}>{`${plainText(show.title)} · ${show.event_date}`}</Button>
                    <ShowRating title={plainText(show.title)} rating={ratings.ratings[show.event_id]} disabled={Boolean(ratings.busy[show.event_id]) || more}
                        error={ratings.errors[show.event_id]} onPick={star => void ratings.rate(show.event_id, star)} />
                </View>) : null}
                {ratings.ready && shows.shows.every(show => ratings.ratings[show.event_id]) ? <YouText>You’ve rated all the shows loaded here.</YouText> : null}
            </> : null}
            {shows?.shows.map((show) => <View key={show.event_id}>
                <Button variant="tertiary" onPress={() => router.push(`/calendar/event/${show.event_id}`)}>{`${plainText(show.title)}\n${show.event_date}${show.venue ? ` · ${plainText(show.venue.name)}` : ''}`}</Button>
                {period === 'past' ? <ShowRating title={plainText(show.title)} rating={ratings.ratings[show.event_id]} disabled={!ratings.ready || ratings.busy[show.event_id] || more}
                    error={ratings.errors[show.event_id]} onPick={star => void ratings.rate(show.event_id, star)} /> : null}
            </View>)}
            {shows && shows.page < shows.pages ? <Button loading={more} onPress={() => void loadMore()}>Load more shows</Button> : null}
        </>}
    </YouFrame>;
}
