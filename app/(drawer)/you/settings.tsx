import { useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useBrowserHandoff } from 'wp-native-shell';
import { Button, TextInput } from '../../../src/components';
import { SectionHeading, StatePanel } from '../../../src/community/components';
import { canDeleteAccount, changeEmail, changePassword, getPreferences, getSettings, updatePreferences, updateSettings, type Settings } from '../../../src/you/client';
import { YouFrame, YouText, useYouAction } from '../../../src/you/components';
import { passwordError, youError } from '../../../src/you/model';

export default function AccountSettings() {
    const { client, logout } = useAuth();
    const { handle } = useBrowserHandoff();
    const router = useRouter();
    const [settings, setSettings] = useState<Settings>();
    const [enabled, setEnabled] = useState(false);
    const [email, setEmail] = useState('');
    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const action = useYouAction();
    async function load() {
        setLoading(true); setError('');
        try {
            const [account, prefs] = await Promise.all([getSettings(client), getPreferences(client)]);
            setSettings(account); setEnabled(prefs.emails_enabled);
        } catch (e) { setError(youError(e)); } finally { setLoading(false); }
    }
    useEffect(() => { void load(); }, [client]);
    return <YouFrame title="Account settings">
        {loading ? <StatePanel loading message="Loading account settings..." /> : error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} /> : settings ? <>
            <SectionHeading>Name</SectionHeading>
            <TextInput label="First name" value={settings.first_name} editable={!action.busy} onChangeText={(first_name) => setSettings({ ...settings, first_name })} />
            <TextInput label="Last name" value={settings.last_name} editable={!action.busy} onChangeText={(last_name) => setSettings({ ...settings, last_name })} />
            <TextInput label="Display name" value={settings.display_name} editable={!action.busy} onChangeText={(display_name) => setSettings({ ...settings, display_name })} />
            <Button loading={action.busy} onPress={() => void action.run(() => updateSettings(client, { first_name: settings.first_name, last_name: settings.last_name, display_name: settings.display_name }))}>Save name</Button>
            <SectionHeading>Notifications</SectionHeading>
            <YouText>Email digest for unread notifications</YouText>
            <Switch accessibilityLabel="Email digest for unread notifications" value={enabled} disabled={action.busy} onValueChange={(next) => void action.run(async () => { await updatePreferences(client, next); setEnabled(next); })} />
            <SectionHeading>Change email</SectionHeading>
            <YouText>{`Current email: ${settings.email}`}</YouText>
            {settings.pending_email ? <YouText>{`Awaiting verification: ${settings.pending_email}`}</YouText> : null}
            <TextInput label="New email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} editable={!action.busy} onChangeText={setEmail} />
            <Button loading={action.busy} disabled={!email.trim()} onPress={() => void action.run(async () => {
                await changeEmail(client, email);
                setSettings({ ...settings, pending_email: email.trim() }); setEmail('');
            }, 'Check your new email inbox for the verification link.')}>Change email</Button>
            <SectionHeading>Change password</SectionHeading>
            <TextInput label="Current password" secureTextEntry autoCapitalize="none" autoCorrect={false} value={current} editable={!action.busy} onChangeText={setCurrent} />
            <TextInput label="New password" secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} editable={!action.busy} onChangeText={setPassword} />
            <TextInput label="Confirm new password" secureTextEntry autoCapitalize="none" autoCorrect={false} value={confirm} editable={!action.busy} onChangeText={setConfirm} />
            <Button loading={action.busy} onPress={() => void action.run(async () => {
                const validation = passwordError(current, password, confirm);
                if (validation) throw new Error(validation);
                await changePassword(client, current, password, confirm);
                setCurrent(''); setPassword(''); setConfirm('');
            }, 'Password changed.')}>Change password</Button>
        </> : null}
        <YouText>{action.message}</YouText>
        <Button variant="tertiary" onPress={() => void action.run(() => handle('https://extrachill.com/privacy-policy/'), '')}>Privacy policy</Button>
        <Button variant="tertiary" onPress={() => void action.run(() => handle('https://extrachill.com/contact-us/'), '')}>Support</Button>
        {canDeleteAccount(client) ? <Button variant="danger" disabled={action.busy} onPress={() => router.push('/you/delete')}>Delete account</Button> : null}
        <Button variant="tertiary" loading={action.busy} onPress={() => void action.run(logout, '')}>Sign out</Button>
    </YouFrame>;
}
