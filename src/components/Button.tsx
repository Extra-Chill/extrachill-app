/**
 * Button component matching root.css button variants
 * 
 * Variants:
 * - primary (button-1): accent3 background (cyan)
 * - secondary (button-2): accent background (green)
 * - tertiary (button-3): card background with border
 * - danger: error color background
 * 
 * Sizes: small, medium, large
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { useTheme } from 'wp-native-shell';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
    children: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
}

export function Button({
    children,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
}: ButtonProps) {
    const theme = useTheme();

    const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
        primary: {
            container: {
                backgroundColor: theme.colors.primary,
            },
            text: {
                color: theme.colors.onPrimary,
            },
        },
        secondary: {
            container: {
                backgroundColor: theme.colors.success,
            },
            text: {
                color: theme.colors.onPrimary,
            },
        },
        tertiary: {
            container: {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
            },
            text: {
                color: theme.colors.textMuted,
            },
        },
        danger: {
            container: {
                backgroundColor: theme.colors.error,
            },
            text: {
                color: theme.colors.onPrimary,
            },
        },
    };

    const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
        small: {
            container: {
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
            },
            text: {
                fontSize: theme.typography.fontSizes.sm,
            },
        },
        medium: {
            container: {
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
            },
            text: {
                fontSize: theme.typography.fontSizes.base,
            },
        },
        large: {
            container: {
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
            },
            text: {
                fontSize: theme.typography.fontSizes.base,
            },
        },
    };

    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { borderRadius: theme.radii.sm },
                variantStyles[variant].container,
                sizeStyles[size].container,
                isDisabled && styles.disabled,
            ]}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    color={variantStyles[variant].text.color}
                    size="small"
                />
            ) : (
                <Text
                    style={[
                        styles.text,
                        variantStyles[variant].text,
                        sizeStyles[size].text,
                        { fontFamily: theme.typography.fontFamily },
                    ]}
                >
                    {children}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.6,
    },
});
