/**
 * Onboarding screen — username selection and preferences.
 *
 * Shown after registration to set final username and optional
 * artist/professional flags.
 *
 * Uses wp-native-shell's useAuth().client for ability calls:
 *   - `extrachill/get-onboarding-status` (initial data load)
 *   - `extrachill/complete-onboarding` (submit)
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from 'wp-native-shell';

import { Button, TextInput, Notice, Checkbox } from '../src/components';

interface OnboardingStatusResult {
    completed: boolean;
    fields: {
        username: string;
        user_is_artist: boolean;
        user_is_professional: boolean;
    };
}

interface OnboardingSubmitResult {
    user: {
        username: string;
    };
}

export default function Onboarding() {
    const router = useRouter();
    const { client } = useAuth();
    const theme = useTheme();

    const [username, setUsername] = useState('');
    const [isArtist, setIsArtist] = useState(false);
    const [isProfessional, setIsProfessional] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchOnboardingStatus() {
            try {
                const status = await client.execute<OnboardingStatusResult>(
                    'extrachill/get-onboarding-status',
                );
                if (cancelled) return;

                setUsername(status.fields.username);
                setIsArtist(status.fields.user_is_artist);
                setIsProfessional(status.fields.user_is_professional);
            } catch {
                if (!cancelled) {
                    setError('Failed to load onboarding data');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void fetchOnboardingStatus();
        return () => { cancelled = true; };
    }, [client]);

    const handleSubmit = async () => {
        setError(null);

        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setError('Please choose a username');
            return;
        }

        if (trimmedUsername.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (trimmedUsername.length > 60) {
            setError('Username must be 60 characters or less');
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
            setError('Username can only contain letters, numbers, hyphens, and underscores');
            return;
        }

        setIsSubmitting(true);

        try {
            await client.execute<OnboardingSubmitResult>(
                'extrachill/complete-onboarding',
                {
                    username: trimmedUsername,
                    user_is_artist: isArtist,
                    user_is_professional: isProfessional,
                },
            );
            router.replace('/(drawer)/feed');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete setup');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.content, { paddingHorizontal: theme.spacing.xl }]}>
                <Text
                    style={[
                        styles.title,
                        {
                            color: theme.colors.text,
                            fontSize: theme.typography.fontSizes.xl,
                            fontFamily: theme.typography.fontFamilyBold ?? theme.typography.fontFamily,
                            marginBottom: theme.spacing.sm,
                        },
                    ]}
                >
                    Welcome to Extra Chill!
                </Text>
                <Text
                    style={[
                        styles.subtitle,
                        {
                            color: theme.colors.textMuted,
                            fontSize: theme.typography.fontSizes.base,
                            fontFamily: theme.typography.fontFamily,
                            marginBottom: theme.spacing.xl,
                        },
                    ]}
                >
                    Let's set up your profile.
                </Text>

                {error && <Notice type="error" message={error} />}

                <Text
                    style={[
                        styles.label,
                        {
                            color: theme.colors.text,
                            fontSize: theme.typography.fontSizes.base,
                            fontFamily: theme.typography.fontFamily,
                            marginBottom: theme.spacing.sm,
                        },
                    ]}
                >
                    Choose your username
                </Text>

                <TextInput
                    placeholder="Your username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                />

                <Text
                    style={[
                        styles.hint,
                        {
                            color: theme.colors.textMuted,
                            fontSize: theme.typography.fontSizes.sm,
                            fontFamily: theme.typography.fontFamily,
                            marginTop: -theme.spacing.sm,
                            marginBottom: theme.spacing.lg,
                        },
                    ]}
                >
                    Letters, numbers, hyphens, and underscores only. 3-60 characters.
                </Text>

                <View style={[styles.checkboxGroup, { marginBottom: theme.spacing.lg }]}>
                    <Checkbox
                        label="I love music"
                        checked={true}
                        disabled={true}
                    />
                    <Checkbox
                        label="I am a musician"
                        checked={isArtist}
                        onPress={() => setIsArtist(!isArtist)}
                        disabled={isSubmitting}
                    />
                    <Checkbox
                        label="I work in the music industry"
                        checked={isProfessional}
                        onPress={() => setIsProfessional(!isProfessional)}
                        disabled={isSubmitting}
                    />
                </View>

                <Button
                    variant="secondary"
                    size="large"
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                >
                    Complete Setup
                </Button>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        textAlign: 'center',
        fontWeight: '600',
    },
    subtitle: {
        textAlign: 'center',
    },
    label: {
        fontWeight: '500',
    },
    hint: {},
    checkboxGroup: {},
});
