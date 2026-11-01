import { useEffect, useReducer, useRef, useState } from 'react';
import { Switch } from 'react-native';
import type { WPNativeClient } from 'wp-native-client';
import { SectionHeading, StatePanel } from '../community/components';
import { YouText } from '../you/components';
import { canManageNewsletter, getSubscriptions, setSubscription } from './client';
import { subscriptionReducer, subscriptionState, type NewsletterList } from './model';

function NewsletterSwitch({ client, list }: { client: WPNativeClient; list: NewsletterList }) {
    const [state, dispatch] = useReducer(subscriptionReducer, list.subscribed, subscriptionState);
    const pending = useRef(false);
    async function toggle(subscribed: boolean) {
        if (pending.current) return;
        pending.current = true;
        dispatch({ type: 'toggle', subscribed });
        try {
            const result = await setSubscription(client, list.key, subscribed);
            dispatch({ type: 'saved', subscribed: result.subscribed });
        } catch {
            dispatch({ type: 'failed', error: "Couldn't save newsletter preference. Please try again." });
        } finally { pending.current = false; }
    }
    return <>
        <YouText>{list.name}</YouText>
        <Switch accessibilityLabel={list.name} value={state.subscribed} disabled={state.pending} onValueChange={(next) => void toggle(next)} />
        {state.error ? <YouText>{state.error}</YouText> : null}
    </>;
}

export function NewsletterSettings({ client }: { client: WPNativeClient }) {
    const available = canManageNewsletter(client);
    const [attempt, retry] = useReducer((value: number) => value + 1, 0);
    const [result, setResult] = useState<{ client: WPNativeClient; lists?: NewsletterList[]; failed?: boolean }>();
    useEffect(() => {
        if (!available) return;
        let cancelled = false;
        setResult(undefined);
        void getSubscriptions(client).then(
            ({ lists }) => { if (!cancelled) setResult({ client, lists }); },
            () => { if (!cancelled) setResult({ client, failed: true }); },
        );
        return () => { cancelled = true; };
    }, [client, available, attempt]);
    if (!available) return null;
    const current = result?.client === client ? result : undefined;
    return <>
        <SectionHeading>Newsletter</SectionHeading>
        {!current ? <StatePanel loading message="Loading newsletter preferences..." /> : current.failed ?
            <StatePanel message="Couldn't load newsletter preferences" actionLabel="Try again" onAction={retry} /> :
            current.lists?.map((list) => <NewsletterSwitch key={list.key} client={client} list={list} />)}
    </>;
}
