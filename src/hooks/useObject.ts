/**
 * React hook for fetching and caching hydrated objects.
 *
 * Implements stale-while-revalidate:
 *   - Cache hit (fresh) → return immediately, no network call
 *   - Cache hit (stale) → return stale data, refresh in background
 *   - Cache miss → show loading, fetch from network
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { HydratedObject } from '@/types/api';
import { objectCache } from '@/cache/objectCache';
import { api } from '@/api/client';

interface UseObjectResult {
    data: HydratedObject | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useObject(
    objectType: string,
    blogId: number,
    id: string
): UseObjectResult {
    const [data, setData] = useState<HydratedObject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track mounted state to avoid setState after unmount
    const mountedRef = useRef(true);

    const fetchAndCache = useCallback(async () => {
        try {
            const result = await api.activity.getObject(objectType, blogId, id);
            await objectCache.set(objectType, blogId, id, result);

            if (mountedRef.current) {
                setData(result);
                setError(null);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof Error ? err.message : 'Failed to load content');
            }
        } finally {
            if (mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [objectType, blogId, id]);

    useEffect(() => {
        mountedRef.current = true;

        // Check cache first
        const cached = objectCache.get(objectType, blogId, id);

        if (cached) {
            // Fresh cache hit — use it, no network call needed
            setData(cached.data);
            setIsLoading(false);
            setError(null);
            return;
        }

        // Check for stale data (expired but present)
        const stale = objectCache.getStale(objectType, blogId, id);

        if (stale) {
            // Stale-while-revalidate: show old data immediately
            setData(stale.data);
            setIsLoading(false);
            setError(null);

            // Refresh in background (don't set loading state)
            fetchAndCache();
            return;
        }

        // Cache miss — fetch from network
        setIsLoading(true);
        setError(null);
        fetchAndCache();

        return () => {
            mountedRef.current = false;
        };
    }, [objectType, blogId, id, fetchAndCache]);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        await fetchAndCache();
    }, [fetchAndCache]);

    return { data, isLoading, error, refresh };
}
