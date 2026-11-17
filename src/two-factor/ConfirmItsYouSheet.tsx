/**
 * "Confirm it's you" sheet. Opened when a Security change answers
 * `revalidation_required`; verifies a fresh code through
 * POST /two-factor/1.0/revalidate, then the caller retries the change.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from 'wp-native-shell';
import { Button, TextInput } from '../components';
import { communityStyles } from '../community/components';
import { sendRevalidationCode, startRevalidation, submitRevalidation, type RestRequester } from './client';
import { codeReady, methodCopy, parseRevalidateChallenge, sanitizeCode, securityError, type ChallengeProvider } from './model';

/** Returns the sheet element and ask(), which resolves true once confirmed. */
export function useConfirmItsYou(request: RestRequester) {
    const resolver = useRef<((confirmed: boolean) => void) | null>(null);
    const [open, setOpen] = useState(false);

    const ask = useCallback(() => new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOpen(true);
    }), []);

    const finish = useCallback((confirmed: boolean) => {
        setOpen(false);
        resolver.current?.(confirmed);
        resolver.current = null;
    }, []);

    const sheet = open ? <ConfirmItsYouSheet request={request} onDone={finish} /> : null;
    return { ask, sheet };
}

function ConfirmItsYouSheet({ request, onDone }: { request: RestRequester; onDone: (confirmed: boolean) => void }) {
    const theme = useTheme();
    const [providers, setProviders] = useState<ChallengeProvider[] | null>(null);
    const [provider, setProvider] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [loadError, setLoadError] = useState(false);

    const load = useCallback(async () => {
        setLoadError(false); setMessage('');
        try {
            const challenge = parseRevalidateChallenge(await startRevalidation(request));
            if (!challenge) throw new Error('No methods');
            setProviders(challenge.providers);
            setProvider(challenge.provider);
        } catch (error) {
            setLoadError(true);
            setMessage(securityError(error));
        }
    }, [request]);

    useEffect(() => { void load(); }, [load]);

    const current = providers?.find((item) => item.key === provider) ?? providers?.[0];
    const copy = current ? methodCopy(current) : null;

    async function run(action: () => Promise<void>) {
        if (busy) return;
        setBusy(true); setMessage('');
        try { await action(); } catch (error) { setMessage(securityError(error)); } finally { setBusy(false); }
    }

    const confirm = () => run(async () => {
        if (!current) return;
        const result = await submitRevalidation(request, current.key, code);
        if (result?.result === 'revalidated') { onDone(true); return; }
        setCode('');
        setMessage("That code didn't work. Check it and try again.");
    });

    const resend = () => run(async () => {
        if (!current) return;
        await sendRevalidationCode(request, current.key);
        setMessage('We sent a code to your email.');
    });

    return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) onDone(false); }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[communityStyles.scrollContent, { paddingTop: 48, backgroundColor: theme.colors.background, flexGrow: 1 }]}>
            <Text accessibilityRole="header" style={[communityStyles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>Confirm it's you</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>
                {copy ? `To change your sign-in security, confirm it's you. ${copy.prompt}` : "To change your sign-in security, confirm it's you."}
            </Text>
            {message ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily }}>{message}</Text> : null}
            {loadError ? <Button onPress={() => void load()}>Try again</Button> : null}
            {current ? <>
                <TextInput
                    label={copy?.title}
                    value={code}
                    onChangeText={(value) => setCode(sanitizeCode(value))}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                    autoCorrect={false}
                    maxLength={12}
                    editable={!busy}
                    onSubmitEditing={() => void confirm()}
                />
                <Button variant="secondary" loading={busy} disabled={!codeReady(current.kind, code)} onPress={() => void confirm()}>Confirm</Button>
                {current.kind === 'email' ? <Button variant="tertiary" disabled={busy} onPress={() => void resend()}>Email me a code</Button> : null}
                {providers && providers.length > 1 ? <View style={[communityStyles.row, { flexWrap: 'wrap' }]}>
                    {providers.map((item) => {
                        const selected = item.key === current.key;
                        return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected, disabled: busy }} disabled={busy}
                            onPress={() => { setProvider(item.key); setCode(''); setMessage(''); }}
                            style={[communityStyles.button, { borderWidth: 1, borderColor: selected ? theme.colors.primary : theme.colors.border }]}>
                            <Text style={{ color: selected ? theme.colors.primary : theme.colors.text, fontFamily: theme.typography.fontFamily }}>{methodCopy(item).title}</Text>
                        </Pressable>;
                    })}
                </View> : null}
            </> : null}
            <Button variant="tertiary" disabled={busy} onPress={() => onDone(false)}>Cancel</Button>
        </ScrollView>
    </Modal>;
}
