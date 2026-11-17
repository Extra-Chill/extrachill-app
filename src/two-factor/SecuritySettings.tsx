/**
 * Settings → Security: two-step sign-in status and management, fully in-app.
 * Hidden entirely when the Two Factor REST routes are not installed (404).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Share, Text, View } from 'react-native';
import type { WPNativeClient } from 'wp-native-client';
import { useTheme } from 'wp-native-shell';
import { Button, TextInput } from '../components';
import { SectionHeading, StatePanel, communityStyles } from '../community/components';
import { YouText } from '../you/components';
import {
    beginAuthenticatorSetup,
    confirmAuthenticatorSetup,
    generateBackupCodes,
    getProviderSettings,
    isRouteMissing,
    runWithRevalidation,
    shellRestRequester,
    updateProviderSettings,
    type EnrollmentResponse,
} from './client';
import { useConfirmItsYou } from './ConfirmItsYouSheet';
import {
    backupCodesText,
    codeReady,
    formatSecret,
    methodCopy,
    parseProviderSettings,
    providerUpdate,
    safeOtpauthUri,
    sanitizeCode,
    securityError,
    settingsSummary,
    statusLine,
    type ProviderChange,
    type ProviderSettings,
    type SecurityProvider,
} from './model';

type Load = { state: 'loading' } | { state: 'hidden' } | { state: 'error' } | { state: 'ready'; settings: ProviderSettings };

export function SecuritySettings({ client, userId }: { client: WPNativeClient; userId: number }) {
    const theme = useTheme();
    const request = useMemo(() => shellRestRequester(client), [client]);
    const confirm = useConfirmItsYou(request);
    const [load, setLoad] = useState<Load>({ state: 'loading' });
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
    const [setupCode, setSetupCode] = useState('');
    const [codes, setCodes] = useState<string[] | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoad({ state: 'ready', settings: parseProviderSettings(await getProviderSettings(request, userId)) });
        } catch (error) {
            setLoad(isRouteMissing(error) ? { state: 'hidden' } : { state: 'error' });
        }
    }, [request, userId]);

    useEffect(() => { setLoad({ state: 'loading' }); void refresh(); }, [refresh]);

    /** Run a sensitive change behind the confirm-it's-you sheet. */
    async function run(action: () => Promise<unknown>, success = '') {
        if (busy) return;
        setBusy(true); setMessage('');
        try {
            const done = await runWithRevalidation(async () => { await action(); return true; }, confirm.ask);
            if (done) setMessage(success);
        } catch (error) {
            setMessage(securityError(error));
        } finally { setBusy(false); }
    }

    if (load.state === 'hidden') return null;

    const heading = <SectionHeading>Two-step sign-in</SectionHeading>;
    if (load.state === 'loading') return <>{heading}<StatePanel loading message="Loading sign-in security..." /></>;
    if (load.state === 'error') return <>{heading}<StatePanel message="Couldn't load sign-in security" actionLabel="Try again" onAction={() => { setLoad({ state: 'loading' }); void refresh(); }} /></>;

    const settings = load.settings;
    const summary = settingsSummary(settings);
    const enabledMethods = settings.providers.filter((provider) => provider.enabled && provider.kind !== 'backup');

    const applyChange = (change: ProviderChange, success: string) => run(async () => {
        const payload = providerUpdate(settings, change);
        const updated = await updateProviderSettings(request, userId, payload);
        setLoad({ state: 'ready', settings: parseProviderSettings(updated) });
    }, success);

    const turnOff = (provider: SecurityProvider) => {
        const payload = providerUpdate(settings, { disable: provider.key });
        const last = payload.enabled_providers.length === 0;
        Alert.alert(
            last ? 'Turn off two-step sign-in?' : `Turn off ${methodCopy(provider).title.toLowerCase()}?`,
            last ? "This is your last method, so your backup codes stop working too and you'll sign in with just your password." : undefined,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Turn off', style: 'destructive', onPress: () => void applyChange({ disable: provider.key }, last ? 'Two-step sign-in is off.' : 'Turned off.') },
            ],
        );
    };

    const startSetup = () => run(async () => {
        setSetupCode('');
        setEnrollment(await beginAuthenticatorSetup(request, userId));
    });

    const finishSetup = () => run(async () => {
        await confirmAuthenticatorSetup(request, userId, setupCode);
        setEnrollment(null); setSetupCode('');
        await refresh();
    }, 'Authenticator app is set up. Get backup codes so you can still sign in if you lose your phone.');

    const openAuthenticator = async (uri: string) => {
        try { await Linking.openURL(uri); }
        catch { setMessage("No authenticator app opened. Copy the setup key into your app instead."); }
    };

    const generate = () => run(async () => {
        const result = await generateBackupCodes(request, userId);
        setCodes(Array.isArray(result?.codes) ? result.codes : []);
        await refresh();
    });
    const newCodes = () => {
        if (!summary.backup?.enabled) { void generate(); return; }
        Alert.alert('Get new backup codes?', 'Your old backup codes will stop working.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Get new codes', onPress: () => void generate() },
        ]);
    };

    const shareText = (message: string) => Share.share(Platform.OS === 'ios' ? { message } : { message, title: 'Extra Chill' }).then(() => undefined, () => undefined);

    const mono = { color: theme.colors.text, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: theme.typography.fontSizes.lg };
    const methodRow = (provider: SecurityProvider | null, offLabel: string, onEnable: () => void) => {
        if (!provider) return null;
        const title = methodCopy(provider).title;
        return <View style={[communityStyles.card, { borderColor: theme.colors.border, gap: theme.spacing.sm }]}>
            <Text style={[communityStyles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{title}</Text>
            <YouText>{provider.enabled ? (provider.primary ? 'On · used first when you sign in' : 'On') : 'Off'}</YouText>
            {provider.enabled ? <>
                {!provider.primary && enabledMethods.length > 1 ? <Button variant="tertiary" disabled={busy} onPress={() => void applyChange({ primary: provider.key }, `${title} is now used first.`)}>Use this first</Button> : null}
                <Button variant="tertiary" disabled={busy} onPress={() => turnOff(provider)}>Turn off</Button>
            </> : <Button disabled={busy} onPress={onEnable}>{offLabel}</Button>}
        </View>;
    };

    const otpauth = enrollment ? safeOtpauthUri(enrollment.otpauth_uri) : '';

    return <>
        {heading}
        <YouText>{statusLine(summary)}</YouText>

        {enrollment ? <View style={[communityStyles.card, { borderColor: theme.colors.border, gap: theme.spacing.sm }]}>
            <Text style={[communityStyles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>Set up your authenticator app</Text>
            <YouText>1. Add Extra Chill to your authenticator app. Tap the button below, or copy this setup key into the app.</YouText>
            <Text selectable accessibilityLabel="Setup key" style={mono}>{formatSecret(enrollment.secret)}</Text>
            {otpauth ? <Button disabled={busy} onPress={() => void openAuthenticator(otpauth)}>Open in authenticator app</Button> : null}
            <Button variant="tertiary" disabled={busy} onPress={() => void shareText(enrollment.secret)}>Copy or share setup key</Button>
            <YouText>2. Enter the 6-digit code the app shows.</YouText>
            <TextInput
                label="6-digit code"
                value={setupCode}
                onChangeText={(value) => setSetupCode(sanitizeCode(value))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                autoCorrect={false}
                maxLength={6}
                editable={!busy}
            />
            <Button variant="secondary" loading={busy} disabled={!codeReady('app', setupCode)} onPress={() => void finishSetup()}>Turn on</Button>
            <Button variant="tertiary" disabled={busy} onPress={() => { setEnrollment(null); setSetupCode(''); }}>Cancel</Button>
        </View> : methodRow(summary.app, 'Set up authenticator app', () => {
            if (summary.app?.configured) void applyChange({ enable: summary.app.key }, 'Authenticator app is on.');
            else void startSetup();
        })}

        {methodRow(summary.email, 'Turn on email codes', () => summary.email && void applyChange({ enable: summary.email.key }, "Email codes are on. We'll email you a code when you sign in."))}

        {summary.backup && (summary.on || codes) ? <View style={[communityStyles.card, { borderColor: theme.colors.border, gap: theme.spacing.sm }]}>
            <Text style={[communityStyles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>Backup codes</Text>
            {codes ? <>
                <YouText>Save these somewhere safe. Each code works once, and you won't see them again.</YouText>
                {codes.map((code) => <Text key={code} selectable style={mono}>{code}</Text>)}
                <Button disabled={busy} onPress={() => void shareText(backupCodesText(codes))}>Copy or share codes</Button>
                <Button variant="tertiary" onPress={() => setCodes(null)}>I saved them</Button>
            </> : <>
                <YouText>{summary.backup.enabled && summary.backup.remaining !== null
                    ? `${summary.backup.remaining} unused ${summary.backup.remaining === 1 ? 'code' : 'codes'} left. Use one if you can't get a code another way.`
                    : "Use a backup code if you can't get a code another way."}</YouText>
                <Button variant={summary.backup.enabled ? 'tertiary' : 'primary'} disabled={busy} onPress={newCodes}>
                    {summary.backup.enabled ? 'Get new backup codes' : 'Get backup codes'}
                </Button>
                {summary.backup.enabled ? <Button variant="tertiary" disabled={busy} onPress={() => summary.backup && turnOff(summary.backup)}>Turn off backup codes</Button> : null}
            </>}
        </View> : null}

        {message ? <YouText>{message}</YouText> : null}
        {confirm.sheet}
    </>;
}
