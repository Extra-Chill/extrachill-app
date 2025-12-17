/**
 * Feed screen - placeholder for authenticated users
 */

import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/context';
import { useTheme } from '../src/theme/context';
import { Button, Notice } from '../src/components';

export default function Feed() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { colors, spacing, fontSize } = useTheme();

    const handleLogout = async () => {
        await logout();
        router.replace('/login');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: spacing.lg }]}>
            <View style={styles.content}>
                <Text
                    style={[
                        styles.welcome,
                        { color: colors.text, fontSize: fontSize.xl, marginBottom: spacing.sm },
                    ]}
                >
                    Welcome, {user?.display_name || user?.username}!
                </Text>

                <Notice type="success" message="Authentication successful" />

                <Text style={[styles.placeholder, { color: colors.muted, fontSize: fontSize.sm }]}>
                    Feed coming soon...
                </Text>
            </View>

            <View style={{ marginBottom: 40 }}>
                <Button variant="danger" size="medium" onPress={handleLogout}>
                    Sign Out
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcome: {
        fontWeight: '700',
        textAlign: 'center',
    },
    placeholder: {
        marginTop: 16,
    },
});
