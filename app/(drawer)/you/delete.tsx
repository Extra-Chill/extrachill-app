import { useState } from 'react';
import { useAuth } from 'wp-native-shell';
import { Button, TextInput } from '../../../src/components';
import { canDeleteAccount, deleteAccount } from '../../../src/you/client';
import { YouFrame, YouText, useYouAction } from '../../../src/you/components';

export default function DeleteAccount() {
    const { client, logout } = useAuth();
    const [confirmation, setConfirmation] = useState('');
    const [deleted, setDeleted] = useState(false);
    const action = useYouAction();
    return <YouFrame title="Delete account">
        {deleted ? <>
            <YouText>Your account was deleted. Sign out to clear this device's session.</YouText>
            <Button loading={action.busy} onPress={() => void action.run(logout, '')}>Sign out</Button>
        </> : canDeleteAccount(client) ? <>
            <YouText>Deleting your account is permanent. Type DELETE to confirm.</YouText>
            <TextInput label="Type DELETE" autoCapitalize="characters" autoCorrect={false} value={confirmation} editable={!action.busy} onChangeText={setConfirmation} />
            <Button variant="danger" disabled={confirmation !== 'DELETE'} loading={action.busy} onPress={() => void action.run(async () => {
                await deleteAccount(client, confirmation);
                setDeleted(true);
                await logout();
            }, '')}>Permanently delete account</Button>
        </> : <YouText>Account deletion is not available.</YouText>}
        <YouText>{action.message}</YouText>
    </YouFrame>;
}
