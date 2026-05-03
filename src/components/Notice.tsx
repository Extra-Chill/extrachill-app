/**
 * Notice component for displaying messages
 * Matches the unified notice system from root.css
 * 
 * Types:
 * - success: Green accent border
 * - info: Secondary accent border
 * - error: Red error border
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'wp-native-shell';

type NoticeType = 'success' | 'info' | 'error';

interface NoticeProps {
    type: NoticeType;
    message: string;
    title?: string;
}

export function Notice({ type, message, title }: NoticeProps) {
    const theme = useTheme();

    const borderColors: Record<NoticeType, string> = {
        success: theme.colors.success,
        info: theme.colors.primary,
        error: theme.colors.error,
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surface,
                    borderLeftColor: borderColors[type],
                    borderRadius: theme.radii.md,
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.md,
                },
            ]}
        >
            {title && (
                <Text
                    style={[
                        styles.title,
                        { color: theme.colors.text, fontSize: theme.typography.fontSizes.base },
                    ]}
                >
                    {title}
                </Text>
            )}
            <Text
                style={[
                    styles.message,
                    { color: theme.colors.text, fontSize: theme.typography.fontSizes.sm },
                ]}
            >
                {message}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderLeftWidth: 4,
    },
    title: {
        fontWeight: '700',
        marginBottom: 4,
    },
    message: {
        lineHeight: 20,
    },
});
