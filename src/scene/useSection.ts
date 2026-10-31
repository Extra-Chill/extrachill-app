import { useCallback, useEffect, useRef, useState } from 'react';

// Each section owns its request and error. Ignore stale completions after a
// client change, refresh, or unmount.
export function useSection<T>(loader: () => Promise<T>) {
    const [data, setData] = useState<T>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const generation = useRef(0);
    const load = useCallback(async () => {
        const request = ++generation.current;
        setLoading(true);
        setError('');
        try {
            const result = await loader();
            if (request === generation.current) setData(result);
        } catch {
            if (request === generation.current) setError('Unable to load this section. Please try again.');
        } finally {
            if (request === generation.current) setLoading(false);
        }
    }, [loader]);
    useEffect(() => {
        setData(undefined);
        void load();
        return () => { generation.current++; };
    }, [load]);
    return { data, loading, error, load };
}
