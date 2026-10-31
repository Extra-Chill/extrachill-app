import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { WPNativeClient } from 'wp-native-client';
import { useTheme } from 'wp-native-shell';
import { StatePanel } from '../community/components';
import { getShowRatings, rateShow, type Ratings } from './client';
import { toggleRating } from './model';

// Each screen owns its snapshot; focus/refresh re-reads it. Never share private data across users.
export function useShowRatings(client: WPNativeClient, ids: number[], owner: number | undefined, revision = 0) {
    const key = `${owner}:${ids.join(',')}:${revision}`;
    const [state, setState] = useState<{ key: string; ratings: Ratings; error: string }>({ key: '', ratings: {}, error: '' });
    const [busy, setBusy] = useState<Record<number, boolean>>({});
    const [errors, setErrors] = useState<Record<number, string>>({});
    const generation = useRef(0);
    const pending = useRef(new Set<number>());
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const token = ++generation.current;
        pending.current.clear(); setBusy({}); setErrors({});
        setState({ key: '', ratings: {}, error: '' });
        if (owner && ids.length) {
            void getShowRatings(client, ids).then(ratings => {
                if (token === generation.current) setState({ key, ratings, error: '' });
            }).catch(() => {
                if (token === generation.current) setState({ key, ratings: {}, error: 'Your ratings could not be loaded.' });
            });
        } else setState({ key, ratings: {}, error: '' });
        return () => { generation.current++; };
    }, [client, key, retry]);
    const ready = state.key === key && !state.error;
    const rate = useCallback(async (id: number, star: number) => {
        if (!ready || !owner || pending.current.has(id)) return;
        const token = generation.current;
        const previous = state.ratings[id] || 0;
        const rating = toggleRating(previous, star);
        pending.current.add(id); setBusy(prev => ({ ...prev, [id]: true }));
        setErrors(prev => ({ ...prev, [id]: '' }));
        setState(prev => ({ ...prev, ratings: { ...prev.ratings, [id]: rating } }));
        try {
            const result = await rateShow(client, id, rating);
            if (token === generation.current) setState(prev => ({ ...prev, ratings: { ...prev.ratings, [id]: result.rating } }));
        } catch {
            if (token === generation.current) {
                setState(prev => ({ ...prev, ratings: { ...prev.ratings, [id]: previous } }));
                setErrors(prev => ({ ...prev, [id]: 'Could not save your rating. Tap a star to try again.' }));
            }
        } finally {
            if (token === generation.current) {
                pending.current.delete(id); setBusy(prev => ({ ...prev, [id]: false }));
            }
        }
    }, [client, owner, ready, state.ratings]);
    return { ratings: state.key === key ? state.ratings : {}, ready, busy, errors, rate,
        status: state.key !== key ? <StatePanel loading message="Loading your ratings..." /> : state.error ? <StatePanel message={state.error} actionLabel="Retry ratings" onAction={() => setRetry(n => n + 1)} /> : null };
}

export function ShowRating({ title, rating = 0, disabled, error, onPick }: {
    title: string; rating?: number; disabled: boolean; error?: string; onPick: (star: number) => void;
}) {
    const theme = useTheme();
    return <View>
        <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily }}>{`Your private rating: ${rating ? `${rating}/5` : 'Not rated'}`}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(star => <Pressable key={star} accessibilityRole="button"
                accessibilityLabel={`${title}: ${star} ${star === 1 ? 'star' : 'stars'}${star === rating ? ', tap to clear' : ''}`}
                accessibilityState={{ selected: star === rating, disabled }} disabled={disabled} onPress={() => onPick(star)}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
                <Text style={{ fontSize: 30, color: star <= rating ? theme.colors.primary : theme.colors.text }}>{star <= rating ? '★' : '☆'}</Text>
            </Pressable>)}
        </View>
        {error ? <StatePanel message={error} /> : null}
    </View>;
}
