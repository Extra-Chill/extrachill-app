import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from 'wp-native-shell';
import { getUnreadCount, markNotificationsRead } from './client';
import { shouldRefreshCount } from './model';

const InboxContext = createContext<{
    count: number;
    refresh: () => Promise<void>;
    markRead: (id?: number) => Promise<void>;
} | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
    const { client, user, isAuthenticated } = useAuth();
    const [count, setCount] = useState(0);
    const lastFetch = useRef<number | null>(null);
    const generation = useRef(0);
    const refresh = useCallback(async () => {
        if (!isAuthenticated || !shouldRefreshCount(lastFetch.current, Date.now())) return;
        lastFetch.current = Date.now();
        const request = ++generation.current;
        try {
            const result = await getUnreadCount(client);
            if (request === generation.current) setCount(result.unread_count);
        } catch {
            // Badge failures must not block navigation; retry on the next focus.
        }
    }, [client, isAuthenticated]);
    const markRead = useCallback(async (id = 0) => {
        await markNotificationsRead(client, id);
        const request = ++generation.current;
        // Mutation-driven reconciliation is not polling.
        try {
            const result = await getUnreadCount(client);
            if (request === generation.current) setCount(result.unread_count);
        } catch {
            if (id === 0) setCount(0);
        }
    }, [client]);
    useEffect(() => {
        generation.current++;
        setCount(0);
        lastFetch.current = null;
        void refresh();
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') void refresh();
        });
        return () => { generation.current++; subscription.remove(); };
    }, [refresh, user?.id]);
    return <InboxContext.Provider value={{ count, refresh, markRead }}>{children}</InboxContext.Provider>;
}
export function useInbox() {
    const inbox = useContext(InboxContext);
    if (!inbox) throw new Error('useInbox requires InboxProvider');
    return inbox;
}
