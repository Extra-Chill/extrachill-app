/**
 * Activity feed card component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/context';
import { formatRelativeTime } from '../utils/time';
import type { ActivityItem, ActivityCardData } from '../types/api';

interface ActivityCardProps {
    item: ActivityItem;
    onPress?: () => void;
}

const MAX_EXCERPT_LENGTH = 120;

const POST_TYPE_LABELS: Record<string, string> = {
    post: 'Blog Post',
    topic: 'Forum Topic',
    reply: 'Forum Reply',
    datamachine_events: 'Event',
    product: 'Product',
    artist_profile: 'Artist Profile',
    artist_link_page: 'Link Page',
    newsletter: 'Newsletter',
    ec_doc: 'Documentation',
    festival_wire: 'Festival Wire',
    wook_horoscope: 'Horoscope',
    page: 'Page',
    forum: 'Forum',
};

function getPostTypeLabel(postType?: string): string {
    if (!postType) return 'Post';
    return POST_TYPE_LABELS[postType] ?? 'Post';
}

function truncateExcerpt(text: string): string {
    if (text.length <= MAX_EXCERPT_LENGTH) {
        return text;
    }
    return text.slice(0, MAX_EXCERPT_LENGTH).trim() + '...';
}

function formatEventMeta(card: ActivityCardData): string | null {
    const parts: string[] = [];

    if (card.event_date) {
        const date = new Date(card.event_date + 'T00:00:00');
        parts.push(
            date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            })
        );
    }

    if (card.event_time) {
        const [hours, minutes] = card.event_time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        parts.push(
            date
                .toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })
                .toLowerCase()
        );
    }

    if (card.venue_name) {
        parts.push(card.venue_name);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
}

export function ActivityCard({ item, onPress }: ActivityCardProps) {
    const { colors, spacing, borderRadius, fontSize, fontFamily } = useTheme();

    const postType = item.data?.post_type;
    const card = item.data?.card;
    const excerpt = card?.excerpt;
    const displayExcerpt = excerpt ? truncateExcerpt(excerpt) : null;

    const eventMeta =
        postType === 'datamachine_events' && card ? formatEventMeta(card) : null;

    const replyContext =
        postType === 'reply' && card?.parent_topic_title
            ? `Replied to: ${card.parent_topic_title}`
            : null;

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
            <View
                style={[
                    styles.badge,
                    {
                        backgroundColor: colors.muted + '20',
                        borderRadius: borderRadius.sm,
                        marginBottom: spacing.sm,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.badgeText,
                        {
                            color: colors.muted,
                            fontSize: fontSize.xs,
                            fontFamily: fontFamily.body,
                        },
                    ]}
                >
                    {getPostTypeLabel(postType)}
                </Text>
            </View>

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
                    {replyContext ?? item.summary}
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

            {eventMeta && (
                <Text
                    style={[
                        styles.eventMeta,
                        {
                            color: colors.text,
                            fontSize: fontSize.sm,
                            fontFamily: fontFamily.body,
                            marginTop: spacing.xs,
                        },
                    ]}
                >
                    {eventMeta}
                </Text>
            )}

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
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeText: {
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
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
    eventMeta: {
        fontWeight: '500',
    },
    excerpt: {
        lineHeight: 20,
    },
});
