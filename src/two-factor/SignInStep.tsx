/**
 * In-app two-step sign-in code step, shown after password, Google, or Apple
 * sign-in returns a `two_factor` challenge. Never opens a web screen.
 */

import { useEffect, useReducer, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'wp-native-shell';
import { Button, Notice, TextInput } from '../components';
import { continueTwoFactorSignIn, type TwoFactorSignInTransport } from './client';
import {
    SIGN_IN_COPY,
    canResend,
    canSubmitCode,
    classifyContinueError,
    createSignInState,
    currentProvider,
    isChallengeExpired,
    methodCopy,
    parseTwoFactorChallenge,
    secondsLeft,
    signInReducer,
    type TwoFactorChallenge,
} from './model';

export type SignInStepExit = 'cancelled' | 'expired';

export function TwoStepSignIn({ challenge, transport, onSignedIn, onExit }: {
    challenge: TwoFactorChallenge;
    transport: TwoFactorSignInTransport;
    onSignedIn: () => Promise<void> | void;
    onExit: (reason: SignInStepExit) => void;
}) {
    const theme = useTheme();
    const [state, dispatch] = useReducer(signInReducer, challenge, createSignInState);
    const [now, setNow] = useState(() => Date.now());
    const provider = currentProvider(state);
    const copy = methodCopy(provider);
    const wait = secondsLeft(state, now);

    useEffect(() => {
        if (!state.retryUntil) return;
        const timer = setInterval(() => {
            const current = Date.now();
            setNow(current);
            dispatch({ type: 'tick', now: current });
        }, 1000);
        return () => clearInterval(timer);
    }, [state.retryUntil]);

    useEffect(() => {
        if (state.outcome === 'expired') onExit('expired');
    }, [state.outcome, onExit]);

    async function submit() {
        const started = Date.now();
        if (!canSubmitCode(state, started)) return;
        if (isChallengeExpired(state.challenge, started)) { dispatch({ type: 'expired' }); return; }
        dispatch({ type: 'submit' });
        try {
            const result = await continueTwoFactorSignIn(transport, state.challenge.continuationToken, { provider: provider.key, code: state.code });
            if (result.status === 'signed_in') {
                dispatch({ type: 'signed_in' });
                await onSignedIn();
                return;
            }
            const next = result.status === 'challenge' ? parseTwoFactorChallenge(result.challenge) : null;
            if (next) dispatch({ type: 'challenge', challenge: next });
            else dispatch({ type: 'failed', failure: { kind: 'invalid', rotated: null }, now: Date.now() });
        } catch (error) {
            dispatch({ type: 'failed', failure: classifyContinueError(error), now: Date.now() });
            setNow(Date.now());
        }
    }

    async function resend() {
        if (!canResend(state, Date.now())) return;
        dispatch({ type: 'resend' });
        try {
            const result = await continueTwoFactorSignIn(transport, state.challenge.continuationToken, { provider: provider.key, resend: true });
            const next = result.status === 'challenge' ? parseTwoFactorChallenge(result.challenge) : null;
            if (next) dispatch({ type: 'challenge', challenge: next, sent: true });
            else dispatch({ type: 'code_sent' });
        } catch (error) {
            dispatch({ type: 'failed', failure: classifyContinueError(error), now: Date.now() });
            setNow(Date.now());
        }
    }

    const text = { color: theme.colors.text, fontFamily: theme.typography.fontFamily };
    const muted = { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily };

    if (state.outcome === 'reset_required') {
        return <View>
            <Notice type="error" title="Choose a new password" message={SIGN_IN_COPY.resetRequired} />
            <Button variant="tertiary" onPress={() => onExit('cancelled')}>Back to sign in</Button>
        </View>;
    }

    const busy = state.status !== 'idle';
    return <View>
        <Text accessibilityRole="header" style={[styles.title, text, { fontSize: theme.typography.fontSizes.xl, marginBottom: theme.spacing.sm }]}>Two-step sign-in</Text>
        <Text style={[muted, { fontSize: theme.typography.fontSizes.base, marginBottom: theme.spacing.lg }]}>{copy.prompt}</Text>

        {state.error ? <Notice type="error" message={wait > 0 ? `${state.error} You can try again in ${wait}s.` : state.error} /> : null}
        {state.notice ? <Notice type="success" message={state.notice} /> : null}

        <TextInput
            accessibilityLabel={copy.title}
            placeholder={provider.kind === 'app' ? '6-digit code' : 'Code'}
            value={state.code}
            onChangeText={(value) => dispatch({ type: 'code', value })}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={12}
            editable={!busy && state.outcome === null}
            onSubmitEditing={() => void submit()}
        />

        <Button variant="secondary" size="large" loading={state.status === 'submitting'} disabled={!canSubmitCode(state, now)} onPress={() => void submit()}>
            {wait > 0 ? `Try again in ${wait}s` : 'Verify'}
        </Button>

        {provider.kind === 'email' ? <View style={{ marginTop: theme.spacing.sm }}>
            <Button variant="tertiary" loading={state.status === 'sending'} disabled={!canResend(state, now)} onPress={() => void resend()}>Email me a new code</Button>
        </View> : null}

        {state.challenge.providers.length > 1 ? <View style={{ marginTop: theme.spacing.lg }}>
            <Text style={[muted, { fontSize: theme.typography.fontSizes.sm, marginBottom: theme.spacing.sm }]}>Use another way</Text>
            <View style={styles.methods}>
                {state.challenge.providers.map((item) => {
                    const selected = item.key === provider.key;
                    return <Pressable
                        key={item.key}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled: busy }}
                        disabled={busy}
                        onPress={() => dispatch({ type: 'select', provider: item.key })}
                        style={[styles.method, { borderColor: selected ? theme.colors.primary : theme.colors.border, borderRadius: theme.radii.md }]}
                    >
                        <Text style={[selected ? { color: theme.colors.primary } : text, { fontSize: theme.typography.fontSizes.sm }]}>{methodCopy(item).title}</Text>
                    </Pressable>;
                })}
            </View>
        </View> : null}

        <View style={{ marginTop: theme.spacing.lg }}>
            <Button variant="tertiary" disabled={busy} onPress={() => onExit('cancelled')}>Back to sign in</Button>
        </View>
    </View>;
}

const styles = StyleSheet.create({
    title: { fontWeight: '700', textAlign: 'center' },
    methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    method: { minHeight: 44, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
