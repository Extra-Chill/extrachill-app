import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { WPNativeClient } from 'wp-native-client';
import { useAuth, useTheme } from 'wp-native-shell';
import { communityStyles } from './components';
import { blockMember, moderationAvailable, reportContent, reportMessage, REPORT_REASONS } from './moderation-client';
import type { ReportReason } from './moderation-model';

export function ModerationActions({ client, ready, postId, authorId, authorName, onBlocked }: {
    client: WPNativeClient; ready: boolean; postId?: number; authorId: number; authorName: string; onBlocked: () => Promise<void>;
}) {
    const { user } = useAuth();
    const theme = useTheme();
    const available = moderationAvailable(client, ready);
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState<ReportReason>('spam');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    if (!user || user.id === authorId || authorId < 1 || (!available.report && !available.block)) return null;

    const submit = async () => {
        if (busy) return;
        setBusy(true);
        setMessage('');
        try {
            const result = await reportContent(client, postId === undefined ? { user_id: authorId } : { post_id: postId }, reason, note);
            setOpen(false);
            Alert.alert('Report received', reportMessage(result));
        } catch (error) {
            setMessage(reportMessage(null, error));
        } finally { setBusy(false); }
    };
    const block = () => Alert.alert(`Block ${authorName}?`, "You won't see their topics or replies. They won't be notified.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', onPress: () => void (async () => {
            setBusy(true);
            try { await blockMember(client, authorId); }
            catch { Alert.alert('Could not block member', 'Please try again.'); return; }
            finally { setBusy(false); }
            await onBlocked();
        })() },
    ]);
    const action = (label: string, onPress: () => void, selected = false) => (
        <Pressable key={label} onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityState={{ selected, disabled: busy }} style={communityStyles.button}>
            <Text style={{ color: selected ? theme.colors.primary : theme.colors.text }}>{selected ? '✓ ' : ''}{label}</Text>
        </Pressable>
    );
    return <>
        <Pressable accessibilityRole="button" accessibilityLabel={`Actions for ${authorName}`} disabled={busy} style={communityStyles.button} onPress={(event) => {
            event.stopPropagation();
            Alert.alert(postId === undefined ? 'Member actions' : 'Post actions', undefined, [
                ...(available.report ? [{ text: 'Report', onPress: () => { setReason('spam'); setNote(''); setMessage(''); setOpen(true); } }] : []),
                ...(available.block ? [{ text: `Block ${authorName}`, onPress: block }] : []),
                { text: 'Cancel', style: 'cancel' as const },
            ]);
        }}><Text style={{ color: theme.colors.primary }}>⋯</Text></Pressable>
        <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) setOpen(false); }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[communityStyles.scrollContent, { paddingTop: 48, backgroundColor: theme.colors.background, flexGrow: 1 }]}>
                <Text style={[communityStyles.cardTitle, { color: theme.colors.text }]}>Report content</Text>
                <Text style={{ color: theme.colors.textMuted }}>Choose a reason. Reports are private and sent to moderators.</Text>
                {REPORT_REASONS.map((item) => action(item.label, () => setReason(item.value), reason === item.value))}
                <TextInput accessibilityLabel="Optional report note" placeholder="Optional note (up to 1000 characters)" placeholderTextColor={theme.colors.textMuted} value={note} onChangeText={setNote} maxLength={1000} multiline editable={!busy} style={[communityStyles.card, { minHeight: 100, color: theme.colors.text, borderColor: theme.colors.border }]} />
                {message ? <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.error }}>{message}</Text> : null}
                {action(busy ? 'Sending…' : 'Submit report', () => void submit())}
                {action('Cancel', () => setOpen(false))}
            </ScrollView>
        </Modal>
    </>;
}
