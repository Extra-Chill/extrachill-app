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
import { useTheme } from '../theme/context';

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
    const { colors, spacing, borderRadius, fontSize } = useTheme();

    const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
        primary: {
            container: {
                backgroundColor: colors.accent3,
            },
            text: {
                color: colors.buttonText,
            },
        },
        secondary: {
            container: {
                backgroundColor: colors.accent,
            },
            text: {
                color: colors.buttonText,
            },
        },
        tertiary: {
            container: {
                backgroundColor: colors.cardBackground,
                borderWidth: 1,
                borderColor: colors.border,
            },
            text: {
                color: colors.muted,
            },
        },
        danger: {
            container: {
                backgroundColor: colors.error,
            },
            text: {
                color: colors.buttonText,
            },
        },
    };

    const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
        small: {
            container: {
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
            },
            text: {
                fontSize: fontSize.sm,
            },
        },
        medium: {
            container: {
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
            },
            text: {
                fontSize: fontSize.base,
            },
        },
        large: {
            container: {
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
            },
            text: {
                fontSize: fontSize.body,
            },
        },
    };

    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { borderRadius: borderRadius.sm },
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
