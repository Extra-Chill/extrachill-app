import type { ReactNode } from 'react';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from 'wp-native-shell';
import { CommunityHeader, communityStyles } from '../community/components';
import { youError } from './model';

export function YouFrame({ title, children, onLeadingPress, refreshing = false, onRefresh }: {
    title: string; children: ReactNode; onLeadingPress?: () => void; refreshing?: boolean; onRefresh?: () => void;
}) {
    const theme = useTheme();
    const router = useRouter();
    return <SafeAreaView style={[communityStyles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <CommunityHeader title={title} leadingLabel={onLeadingPress ? 'Menu' : 'Back'} onLeadingPress={onLeadingPress ?? (() => router.back())} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={communityStyles.scrollContent}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} /> : undefined}>
            {children}
        </ScrollView>
    </SafeAreaView>;
}

export function YouText({ children }: { children: ReactNode }) {
    const theme = useTheme();
    return <Text accessibilityLiveRegion="polite" style={[communityStyles.body, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>{children}</Text>;
}

export function useYouAction() {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    async function run(action: () => Promise<unknown>, success = 'Saved.') {
        if (busy) return;
        setBusy(true); setMessage('');
        try { await action(); setMessage(success); } catch (error) { setMessage(youError(error)); }
        finally { setBusy(false); }
    }
    return { busy, message, run };
}
