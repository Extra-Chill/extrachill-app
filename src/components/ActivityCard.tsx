/**
 * Activity feed card component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/context';
import { formatRelativeTime } from '../utils/time';
import type { ActivityItem } from '../types/api';

interface ActivityCardProps {
    item: ActivityItem;
    onPress?: () => void;
}

const MAX_EXCERPT_LENGTH = 120;

function truncateExcerpt(text: string): string {
    if (text.length <= MAX_EXCERPT_LENGTH) {
        return text;
    }
    return text.slice(0, MAX_EXCERPT_LENGTH).trim() + '...';
}

export function ActivityCard({ item, onPress }: ActivityCardProps) {
    const { colors, spacing, borderRadius, fontSize, fontFamily } = useTheme();

    const excerpt = item.data?.card?.excerpt;
    const displayExcerpt = excerpt ? truncateExcerpt(excerpt) : null;

    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: colors.cardBackground,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                },
            ]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <View style={styles.header}>
                <Text
                    style={[
                        styles.summary,
                        {
                            color: colors.text,
                            fontSize: fontSize.base,
                            fontFamily: fontFamily.body,
                        },
                    ]}
                    numberOfLines={2}
                >
                    {item.summary}
                </Text>
                <Text
                    style={[
                        styles.timestamp,
                        {
                            color: colors.muted,
                            fontSize: fontSize.sm,
                            fontFamily: fontFamily.body,
                        },
                    ]}
                >
                    {formatRelativeTime(item.created_at)}
                </Text>
            </View>

            {displayExcerpt && (
                <Text
                    style={[
                        styles.excerpt,
                        {
                            color: colors.muted,
                            fontSize: fontSize.sm,
                            fontFamily: fontFamily.body,
                            marginTop: spacing.sm,
                        },
                    ]}
                    numberOfLines={3}
                >
                    {displayExcerpt}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {},
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    summary: {
        flex: 1,
        fontWeight: '500',
        marginRight: 8,
    },
    timestamp: {},
    excerpt: {
        lineHeight: 20,
    },
});
