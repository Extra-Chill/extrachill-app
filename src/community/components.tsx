import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'wp-native-shell';
import { displayDate } from './model';
import type { PublicVoice } from './types';

interface HeaderProps {
    title: string;
    subtitle?: string;
    onLeadingPress: () => void;
    leadingLabel?: string;
    trailing?: ReactNode;
}

export function CommunityHeader({
    title,
    subtitle,
    onLeadingPress,
    leadingLabel = 'Menu',
    trailing,
}: HeaderProps) {
    const theme = useTheme();
    return (
        <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Pressable
                onPress={onLeadingPress}
                accessibilityRole="button"
                accessibilityLabel={leadingLabel === 'Back' ? 'Go back' : 'Open menu'}
                style={styles.headerSide}
            >
                <Text style={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamily }}>{leadingLabel}</Text>
            </Pressable>
            <View style={styles.headerTitle}>
                <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.fontFamilyBold ?? theme.typography.fontFamily }]}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text numberOfLines={1} style={[styles.subtitle, { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }]}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            <View style={styles.headerSide}>{trailing}</View>
        </View>
    );
}

export function SectionHeading({ children }: { children: string }) {
    const theme = useTheme();
    return (
        <Text style={[styles.sectionHeading, { color: theme.colors.text, fontFamily: theme.typography.fontFamilyBold ?? theme.typography.fontFamily }]}>
            {children}
        </Text>
    );
}

export function StatePanel({
    message,
    loading = false,
    actionLabel,
    onAction,
}: {
    message: string;
    loading?: boolean;
    actionLabel?: string;
    onAction?: () => void;
}) {
    const theme = useTheme();
    return (
        <View style={styles.state} accessibilityLiveRegion="polite">
            {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
            <Text style={[styles.stateText, { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }]}>{message}</Text>
            {actionLabel && onAction ? (
                <Pressable onPress={onAction} accessibilityRole="button" style={[styles.action, { backgroundColor: theme.colors.primary }]}>
                    <Text style={{ color: theme.colors.onPrimary, fontFamily: theme.typography.fontFamilyBold ?? theme.typography.fontFamily }}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function IdentityLine({
    authorName,
    date,
    voice,
}: {
    authorName: string;
    date: string;
    voice?: PublicVoice | null;
}) {
    const theme = useTheme();
    const identity = voice?.name || authorName || 'Community member';
    return (
        <View style={styles.identityRow}>
            <Text style={[styles.identity, { color: theme.colors.text, fontFamily: theme.typography.fontFamilyBold ?? theme.typography.fontFamily }]}>{identity}</Text>
            {voice?.automated ? <Text style={[styles.badge, { color: theme.colors.textMuted, borderColor: theme.colors.border }]}>Automated</Text> : null}
            <Text style={[styles.date, { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }]}>{displayDate(date)}</Text>
        </View>
    );
}

export function CanonicalButton({ onPress, label = 'Open on web' }: { onPress: () => void; label?: string }) {
    const theme = useTheme();
    return (
        <Pressable onPress={onPress} accessibilityRole="link" style={styles.linkButton}>
            <Text style={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamily }}>{label}</Text>
        </Pressable>
    );
}

export const communityStyles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },
    card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 16, gap: 8 },
    cardTitle: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
    body: { fontSize: 16, lineHeight: 24 },
    meta: { fontSize: 13, lineHeight: 18 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    grow: { flex: 1 },
    button: { minHeight: 44, borderRadius: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});

const styles = StyleSheet.create({
    header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
    headerSide: { width: 76, minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700' },
    subtitle: { fontSize: 11, marginTop: 2 },
    sectionHeading: { fontSize: 20, fontWeight: '700', marginTop: 4 },
    state: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
    stateText: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
    action: { minHeight: 44, borderRadius: 8, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
    identityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
    identity: { fontSize: 14, fontWeight: '600' },
    date: { fontSize: 12 },
    badge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
    linkButton: { minHeight: 40, alignSelf: 'flex-start', justifyContent: 'center' },
});
