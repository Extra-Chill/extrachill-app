/**
 * Onboarding screen - username selection and preferences
 * 
 * Shown after registration to set final username and optional artist/professional flags.
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
import { useAuth } from '../src/auth/context';
import { useTheme } from '../src/theme/context';
import { api } from '../src/api/client';
import { Button, TextInput, Notice, Checkbox } from '../src/components';

export default function Onboarding() {
    const router = useRouter();
    const { completeOnboarding } = useAuth();
    const { colors, spacing, fontSize, fontFamily } = useTheme();

    const [username, setUsername] = useState('');
    const [isArtist, setIsArtist] = useState(false);
    const [isProfessional, setIsProfessional] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchOnboardingStatus = async () => {
            try {
                const status = await api.getOnboardingStatus();
                setUsername(status.fields.username);
                setIsArtist(status.fields.user_is_artist);
                setIsProfessional(status.fields.user_is_professional);
            } catch (err) {
                setError('Failed to load onboarding data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOnboardingStatus();
    }, []);

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
            await completeOnboarding(trimmedUsername, isArtist, isProfessional);
            router.replace('/(drawer)/feed');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete setup');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.content, { paddingHorizontal: spacing.xl }]}>
                <Text
                    style={[
                        styles.title,
                        {
                            color: colors.text,
                            fontSize: fontSize.xl,
                            fontFamily: fontFamily.heading,
                            marginBottom: spacing.sm,
                        },
                    ]}
                >
                    Welcome to Extra Chill!
                </Text>
                <Text
                    style={[
                        styles.subtitle,
                        {
                            color: colors.muted,
                            fontSize: fontSize.base,
                            fontFamily: fontFamily.body,
                            marginBottom: spacing.xl,
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
                            color: colors.text,
                            fontSize: fontSize.base,
                            fontFamily: fontFamily.body,
                            marginBottom: spacing.sm,
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
                            color: colors.muted,
                            fontSize: fontSize.sm,
                            fontFamily: fontFamily.body,
                            marginTop: -spacing.sm,
                            marginBottom: spacing.lg,
                        },
                    ]}
                >
                    Letters, numbers, hyphens, and underscores only. 3-60 characters.
                </Text>

                <View style={[styles.checkboxGroup, { marginBottom: spacing.lg }]}>
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
