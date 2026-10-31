import { useEffect, useState } from 'react';
import { useAuth } from 'wp-native-shell';
import { Button, TextInput } from '../../../src/components';
import { StatePanel } from '../../../src/community/components';
import { getProfile, updateProfile, type ProfileFields } from '../../../src/you/client';
import { YouFrame, YouText, useYouAction } from '../../../src/you/components';
import { youError } from '../../../src/you/model';

export default function EditProfile() {
    const { client, user } = useAuth();
    const [fields, setFields] = useState<ProfileFields>();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const action = useYouAction();
    async function load() {
        setLoading(true); setError('');
        try {
            if (!user) throw new Error('Sign in to edit your profile.');
            const profile = await getProfile(client, user.id);
            setFields({ custom_title: profile.custom_title, bio: profile.bio, local_city: profile.local_city });
        } catch (e) { setError(youError(e)); } finally { setLoading(false); }
    }
    useEffect(() => { void load(); }, [client, user?.id]);
    return <YouFrame title="Edit profile">
        {loading ? <StatePanel loading message="Loading profile..." /> : error ? <StatePanel message={error} actionLabel="Try again" onAction={() => void load()} /> : fields ? <>
            <TextInput label="Title" value={fields.custom_title} editable={!action.busy} onChangeText={(custom_title) => setFields({ ...fields, custom_title })} />
            <TextInput label="Bio" multiline value={fields.bio} editable={!action.busy} onChangeText={(bio) => setFields({ ...fields, bio })} />
            <TextInput label="City" value={fields.local_city} editable={!action.busy} onChangeText={(local_city) => setFields({ ...fields, local_city })} />
            <Button loading={action.busy} onPress={() => void action.run(() => updateProfile(client, fields))}>Save profile</Button>
            <YouText>{action.message}</YouText>
        </> : null}
    </YouFrame>;
}
