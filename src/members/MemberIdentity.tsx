import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from 'wp-native-shell';
import { Avatar } from '../components';
import { memberRoute } from './model';

export function MemberIdentity({ id, name, avatar }: { id?: number; name: string; avatar?: string }) {
    const { user } = useAuth();
    const theme = useTheme();
    const router = useRouter();
    const route = memberRoute(id, user?.id);
    return <Pressable disabled={!route} accessibilityRole="link" accessibilityLabel={`View ${name}'s profile`} onPress={(event) => { event.stopPropagation(); if (route) router.push(route); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
        {avatar ? <Avatar url={avatar} /> : null}
        <Text style={{ color: route ? theme.colors.primary : theme.colors.text, fontWeight: '600' }}>{name || 'Community member'}</Text>
    </Pressable>;
}
