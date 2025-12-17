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
import { useTheme } from '../theme/context';

type NoticeType = 'success' | 'info' | 'error';

interface NoticeProps {
    type: NoticeType;
    message: string;
    title?: string;
}

export function Notice({ type, message, title }: NoticeProps) {
    const { colors, spacing, borderRadius, fontSize } = useTheme();

    const borderColors: Record<NoticeType, string> = {
        success: colors.accent,
        info: colors.accent2,
        error: colors.error,
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.noticeBg,
                    borderLeftColor: borderColors[type],
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                },
            ]}
        >
            {title && (
                <Text
                    style={[
                        styles.title,
                        { color: colors.text, fontSize: fontSize.base },
                    ]}
                >
                    {title}
                </Text>
            )}
            <Text
                style={[
                    styles.message,
                    { color: colors.text, fontSize: fontSize.sm },
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
