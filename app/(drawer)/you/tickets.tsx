import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from 'wp-native-shell';
import { Button } from '../../../src/components';
import { SectionHeading, StatePanel } from '../../../src/community/components';
import { plainText } from '../../../src/community/model';
import { useSiteClient } from '../../../src/network/site-client';
import { YouFrame, YouText } from '../../../src/you/components';
import { ticketCache } from '../../../src/tickets/cache';
import { listMyTickets, SHOP_REST_ROOT } from '../../../src/tickets/client';
import { PassQR } from '../../../src/tickets/components';
import { shapeOrders, type SavedOrders } from '../../../src/tickets/model';

export default function MyTickets() {
    const { user } = useAuth();
    const { client, ready, error: discoveryError, retry } = useSiteClient(SHOP_REST_ROOT);
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId?: string }>();
    const [saved, setSaved] = useState<SavedOrders | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    useFocusEffect(useCallback(() => {
        let current = true;
        const id = user?.id;
        setSaved(null); setError(''); setLoading(true);
        void (async () => {
            if (!id) { setLoading(false); return; }
            try {
                await ticketCache.setUser(id);
                const cached = await ticketCache.load(id);
                if (current) setSaved(cached);
                if (!ready) return;
                const payload = await listMyTickets(client);
                const value = { userId: id, payload, updatedAt: new Date().toISOString() };
                if (!current) return;
                setSaved(value);
                await ticketCache.save(id, payload, value.updatedAt);
            } catch {
                if (current) setError('Could not refresh tickets. Saved passes are still available.');
            } finally { if (current) setLoading(false); }
        })();
        return () => { current = false; };
    }, [user?.id, client, ready, revision]));
    const visible = saved?.userId === user?.id ? saved : null;
    const orders = visible ? shapeOrders(visible.payload) : [];
    return <YouFrame title="My tickets" refreshing={loading} onRefresh={() => { retry(); setRevision(n => n + 1); }}>
        {!user ? <StatePanel message="Sign in to see your tickets." /> : null}
        {visible ? <YouText>{`Saved on this phone · last updated ${new Date(visible.updatedAt).toLocaleString()}`}</YouText> : null}
        {error || discoveryError ? <StatePanel message={error || 'Offline. Showing tickets saved on this phone, if available.'} actionLabel="Try again" onAction={() => { retry(); setRevision(n => n + 1); }} /> : null}
        {loading && !visible ? <StatePanel loading message="Loading tickets..." /> : null}
        {!loading && visible && !orders.length ? <YouText>No ticket orders yet.</YouText> : null}
        {orders.map(order => <View key={order.order_id}>
            <Button variant="tertiary" onPress={() => setExpanded(expanded === order.order_id ? null : order.order_id)}>{`${plainText(order.event_title)}\n${order.created_at} · ${order.quantity} ticket(s) · ${order.status}`}</Button>
            {expanded === order.order_id || (expanded === null && eventId === String(order.event_id)) ? <>
                <Button onPress={() => router.push(`/calendar/event/${order.event_id}`)}>View event</Button>
                {order.passes.map((pass, index) => <View key={`${pass.code}:${index}`}>
                    <SectionHeading>{`Pass ${index + 1} · ${pass.status}`}</SectionHeading>
                    {pass.showQR ? <PassQR code={pass.code} /> : null}
                    <YouText>{pass.code}</YouText>
                </View>)}
            </> : null}
        </View>)}
    </YouFrame>;
}
