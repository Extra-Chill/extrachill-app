/**
 * Unified auth screen - handles both login and registration
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Image,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/context';
import { useTheme } from '../src/theme/context';
import { Button, TextInput, Notice, GoogleSignInButton } from '../src/components';

type AuthMode = 'login' | 'register';

export default function Login() {
    const router = useRouter();
    const { login, register, loginWithGoogle, sessionExpired, clearSessionExpired, onboardingCompleted, googleEnabled } = useAuth();
    const { colors, spacing, fontSize, fontFamily } = useTheme();

    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    useEffect(() => {
        return () => {
            if (sessionExpired) {
                clearSessionExpired();
            }
        };
    }, [sessionExpired, clearSessionExpired]);

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setError(null);
        setPassword('');
        setPasswordConfirm('');
    };

    const handleSubmit = async () => {
        setError(null);

        if (mode === 'login') {
            if (!email.trim() || !password.trim()) {
                setError('Please enter username and password');
                return;
            }

            setIsSubmitting(true);
            try {
                await login(email.trim(), password);
                if (onboardingCompleted) {
                    router.replace('/(drawer)/feed');
                } else {
                    router.replace('/onboarding');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Login failed');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (!email.trim() || !password.trim() || !passwordConfirm.trim()) {
                setError('Please fill in all fields');
                return;
            }

            if (password.length < 8) {
                setError('Password must be at least 8 characters');
                return;
            }

            if (password !== passwordConfirm) {
                setError('Passwords do not match');
                return;
            }

            setIsSubmitting(true);
            try {
                const result = await register(email.trim(), password, passwordConfirm);
                if (result.onboardingCompleted) {
                    router.replace('/(drawer)/feed');
                } else {
                    router.replace('/onboarding');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Registration failed');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsGoogleLoading(true);

        try {
            const result = await loginWithGoogle();
            if (result.onboardingCompleted) {
                router.replace('/(drawer)/feed');
            } else {
                router.replace('/onboarding');
            }
        } catch (err) {
            if (err instanceof Error && err.message !== 'Sign-in cancelled') {
                setError(err.message);
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const isLogin = mode === 'login';
    const isAnyLoading = isSubmitting || isGoogleLoading;

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
                    {isLogin ? 'Sign in to continue' : 'Create your account'}
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
                    placeholder={isLogin ? 'Username or email' : 'Email'}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!isAnyLoading}
                />

                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isAnyLoading}
                />

                {!isLogin && (
                    <TextInput
                        placeholder="Confirm password"
                        value={passwordConfirm}
                        onChangeText={setPasswordConfirm}
                        secureTextEntry
                        editable={!isAnyLoading}
                    />
                )}

                <View style={{ marginTop: spacing.sm }}>
                    <Button
                        variant="secondary"
                        size="large"
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        disabled={isAnyLoading}
                    >
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </Button>
                </View>

                {googleEnabled && (
                    <View style={[styles.dividerContainer, { marginTop: spacing.lg }]}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.muted, fontFamily: fontFamily.body }]}>
                            or
                        </Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>
                )}

                {googleEnabled && (
                    <View style={{ marginTop: spacing.lg }}>
                        <GoogleSignInButton
                            onPress={handleGoogleSignIn}
                            loading={isGoogleLoading}
                            disabled={isAnyLoading}
                        />
                    </View>
                )}

                <View style={[styles.toggleContainer, { marginTop: spacing.lg }]}>
                    <Text style={[styles.toggleText, { color: colors.muted, fontFamily: fontFamily.body }]}>
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    </Text>
                    <Pressable onPress={() => switchMode(isLogin ? 'register' : 'login')} disabled={isAnyLoading}>
                        <Text style={[styles.toggleLink, { color: colors.accent, fontFamily: fontFamily.body }]}>
                            {isLogin ? 'Create one' : 'Sign in'}
                        </Text>
                    </Pressable>
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
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 14,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 14,
    },
    toggleLink: {
        fontSize: 14,
        fontWeight: '600',
    },
});
