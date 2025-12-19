/**
 * Login screen
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/context';
import { useTheme } from '../src/theme/context';
import { Button, TextInput, Notice } from '../src/components';

export default function Login() {
    const router = useRouter();
    const { login, sessionExpired, clearSessionExpired } = useAuth();
    const { colors, spacing, fontSize, fontFamily } = useTheme();

    useEffect(() => {
        return () => {
            if (sessionExpired) {
                clearSessionExpired();
            }
        };
    }, [sessionExpired, clearSessionExpired]);

    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async () => {
        if (!identifier.trim() || !password.trim()) {
            setError('Please enter username and password');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await login(identifier.trim(), password);
            router.replace('/(drawer)/feed');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.content, { paddingHorizontal: spacing.xl }]}>
                <Image
                    source={require('../assets/logo.png')}
                    style={[styles.logo, { marginBottom: spacing.lg }]}
                    resizeMode="contain"
                />
                <Text
                    style={[
                        styles.subtitle,
                        { 
                            color: colors.muted, 
                            fontSize: fontSize.base, 
                            marginBottom: spacing.xl,
                            fontFamily: fontFamily.body,
                        },
                    ]}
                >
                    Sign in to continue
                </Text>

                {sessionExpired && (
                    <Notice
                        type="error"
                        title="Session Expired"
                        message="Please log in again."
                    />
                )}

                {error && <Notice type="error" message={error} />}

                <TextInput
                    placeholder="Username or email"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!isSubmitting}
                />

                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isSubmitting}
                />

                <View style={{ marginTop: spacing.sm }}>
                    <Button
                        variant="secondary"
                        size="large"
                        onPress={handleLogin}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                    >
                        Sign In
                    </Button>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    logo: {
        height: 90,
        width: '100%',
        alignSelf: 'center',
    },
    subtitle: {
        textAlign: 'center',
    },
});
