import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from 'wp-native-shell';
import { CanonicalButton, SectionHeading } from '../community/components';
import { safeLink } from '../events/model';
import { EVENTS_REST_ROOT } from '../events/client';
import { useSiteClient } from '../network/site-client';
import { YouText } from '../you/components';
import { getMyPass, getTicketOffer } from './client';
import { activePass, offerCard, type TicketCard } from './model';

export function EventTickets({ eventId, legacyURL, open }: { eventId: number; legacyURL: string | null; open: (url: string) => void }) {
    const { user } = useAuth();
    const { client, ready } = useSiteClient(EVENTS_REST_ROOT);
    const router = useRouter();
    const [result, setResult] = useState<{ eventId: number; userId?: number; card: TicketCard | null; held: boolean } | null>(null);
    useEffect(() => {
        let current = true;
        setResult(null);
        if (!ready || !client.describe('extrachill/get-event-ticket-offer')) return;
        void (async () => {
            try {
                const card = offerCard(await getTicketOffer(client, eventId));
                if (current) setResult({ eventId, userId: user?.id, card, held: false });
                if (card && user && client.describe('extrachill/get-my-event-pass')) {
                    try {
                        const pass = await getMyPass(client, eventId);
                        if (current) setResult({ eventId, userId: user.id, card, held: pass.issued && activePass(pass) });
                    } catch { /* Public offer remains usable if personal pass lookup fails. */ }
                }
            } catch { /* Older servers retain their outbound ticket link. */ }
        })();
        return () => { current = false; };
    }, [client, ready, eventId, user?.id]);
    const value = result?.eventId === eventId && result.userId === user?.id ? result : null;
    if (!value?.card) return legacyURL ? <CanonicalButton label="Tickets" onPress={() => open(legacyURL)} /> : null;
    const { card } = value;
    const url = safeLink(card.url);
    return <>
        <SectionHeading>Extra Chill tickets</SectionHeading>
        <YouText>{card.saleOpen ? 'Sale open' : 'Sale closed'}</YouText>
        {card.rows.map(row => <YouText key={row.id}>{`${row.name} · ${row.price} · ${row.availability}`}</YouText>)}
        {value.held ? <>
            <YouText>You have a ticket</YouText>
            <CanonicalButton label="View my pass" onPress={() => router.push({ pathname: '/you/tickets', params: { eventId } })} />
        </> : null}
        {card.saleOpen && card.canBuy && url ? <CanonicalButton label="Buy tickets" onPress={() => open(url)} /> : null}
    </>;
}
