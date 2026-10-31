import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from 'wp-native-shell';
import { Button } from '../components';
import { SectionHeading, StatePanel } from '../community/components';
import { plainText } from '../community/model';
import { ARTIST_REST_ROOT, getUserArtists, type ArtistMembership } from './client';

export function MyArtists() {
    const { client, user } = useAuth();
    const artistClient = useMemo(() => client.derive(ARTIST_REST_ROOT), [client]);
    const router = useRouter();
    const [artists, setArtists] = useState<ArtistMembership[]>([]);
    const [error, setError] = useState(false);
    const generation = useRef(0);
    const load = useCallback(async () => {
        const request = ++generation.current;
        setArtists([]); setError(false);
        if (!user) return;
        try {
            const result = await getUserArtists(artistClient, user.id);
            if (request === generation.current) setArtists(result);
        } catch { if (request === generation.current) setError(true); }
    }, [artistClient, user?.id]);
    useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
    if (error) return <StatePanel message="Unable to load artist memberships." actionLabel="Try again" onAction={() => void load()} />;
    if (!artists.length) return null;
    return <>
        <SectionHeading>My Artists</SectionHeading>
        {artists.map((artist) => <Button key={artist.id} variant="tertiary" onPress={() => router.push(`/you/artists/${artist.id}`)}>{plainText(artist.name)}</Button>)}
    </>;
}
