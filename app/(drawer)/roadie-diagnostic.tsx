import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { randomUUID } from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useTheme } from 'wp-native-shell';
import {
    createRoadieSession,
    getRoadieRun,
    getRoadieSession,
    listAccessibleAgents,
    listRoadieRunEvents,
    listRoadieSessions,
    resolveRoadiePendingAction,
    ROADIE_AGENT,
    sendRoadieMessage,
} from '../../src/roadie/client';
import {
    findPendingActions,
    isTerminalRunStatus,
    normalizeMessages,
    pendingPreviewText,
} from '../../src/roadie/normalize';
import type { DisplayMessage, PendingAction } from '../../src/roadie/types';

const ACTIVE_RUN_KEY = 'extrachill.roadie.active-run';

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown Roadie error';
}

function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function RoadieDiagnostic() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const { client, user } = useAuth();
    const theme = useTheme();
    const sessionLoad = useRef(0);
    const bootstrapLoad = useRef(0);
    const resolvedActions = useRef(new Set<string>());
    const [sessionId, setSessionId] = useState('');
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [runStatus, setRunStatus] = useState('idle');
    const [runEvents, setRunEvents] = useState<unknown[]>([]);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [runActive, setRunActive] = useState(false);
    const [resolvingAction, setResolvingAction] = useState('');

    const loadSession = async (id: string) => {
        const loadId = ++sessionLoad.current;
        const result = await getRoadieSession(client, id);
        if (loadId !== sessionLoad.current) {
            return;
        }
        setSessionId(result.session.session_id);
        setMessages(normalizeMessages(result.session.messages));
    };

    const bootstrap = async () => {
        const bootstrapId = ++bootstrapLoad.current;
        setLoading(true);
        setError('');
        setRunStatus('idle');
        try {
            const accessible = await listAccessibleAgents(client);
            if (bootstrapId !== bootstrapLoad.current) {
                return;
            }
            if (!accessible.agents.some((agent) => agent.slug === ROADIE_AGENT)) {
                setSessionId('');
                setMessages([]);
                setError('Roadie is not accessible to this account.');
                return;
            }

            const sessions = await listRoadieSessions(client);
            if (bootstrapId !== bootstrapLoad.current) {
                return;
            }
            const current = sessions.sessions[0]
                ?? (await createRoadieSession(client)).session;
            if (bootstrapId !== bootstrapLoad.current) {
                return;
            }
            await loadSession(current.session_id);
            const storedRun = await AsyncStorage.getItem(ACTIVE_RUN_KEY);
            if (bootstrapId !== bootstrapLoad.current) {
                return;
            }
            if (storedRun) {
                const active = JSON.parse(storedRun) as { sessionId?: unknown; runId?: unknown };
                if (typeof active.sessionId === 'string' && typeof active.runId === 'string') {
                    setRunActive(true);
                    const terminal = await observeRun(active.sessionId, active.runId);
                    if (terminal) {
                        await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
                        setRunActive(false);
                        await loadSession(active.sessionId);
                    } else {
                        setError('Roadie is still working. Sending another message remains disabled.');
                    }
                }
            } else {
                setRunActive(false);
            }
        } catch (bootstrapError) {
            setError(errorMessage(bootstrapError));
        } finally {
            if (bootstrapId === bootstrapLoad.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        void bootstrap();
    }, [client]);

    const observeRun = async (id: string, runId: string) => {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const diagnostics = await Promise.allSettled([
                getRoadieRun(client, id, runId),
                listRoadieRunEvents(client, id, runId),
            ]);
            const run = diagnostics[0];
            const events = diagnostics[1];
            if (events.status === 'fulfilled') {
                setRunEvents(events.value.events);
            }
            if (run.status === 'fulfilled') {
                setRunStatus(run.value.status);
                if (isTerminalRunStatus(run.value.status)) {
                    return true;
                }
            }
            await wait(1000);
        }

        return false;
    };

    const send = async () => {
        const message = draft.trim();
        if (!message || !sessionId || sending) {
            return;
        }

        setSending(true);
        setDraft('');
        setError('');
        setRunStatus('starting');
        setRunActive(true);
        setRunEvents([]);
        const runId = `app_${randomUUID()}`;

        try {
            await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({ sessionId, runId }));
            const result = await sendRoadieMessage(client, sessionId, runId, message);
            const acceptedRunId = result.run_id ?? runId;
            await AsyncStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({ sessionId: result.session_id, runId: acceptedRunId }));
            const actions = findPendingActions(result).filter(
                (action) => !resolvedActions.current.has(action.action_id),
            );
            setPendingActions(actions);
            setRunStatus(result.completed === false ? 'running' : 'completed');
            const terminal = await observeRun(result.session_id, acceptedRunId);
            if (!terminal) {
                setError('Roadie is still working after the diagnostic polling window. Sending another message is disabled until this screen is reloaded.');
                return;
            }
            await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
            setRunActive(false);
            await loadSession(result.session_id);
            if (actions.length > 0) {
                setPendingActions(actions);
            }
        } catch (sendError) {
            setRunStatus('failed');
            setRunActive(false);
            await AsyncStorage.removeItem(ACTIVE_RUN_KEY);
            setError(errorMessage(sendError));
        } finally {
            setSending(false);
        }
    };

    const decide = async (action: PendingAction, decision: 'accepted' | 'rejected') => {
        if (!user) {
            return;
        }

        setError('');
        setResolvingAction(action.action_id);
        try {
            const result = await resolveRoadiePendingAction(client, action, decision, user.id);
            if (result.result?.success === false) {
                throw new Error(result.result.error || 'Roadie could not resolve this action.');
            }
            resolvedActions.current.add(action.action_id);
            setPendingActions((current) => current.filter((candidate) => candidate.action_id !== action.action_id));
            await loadSession(sessionId);
        } catch (decisionError) {
            setError(errorMessage(decisionError));
        } finally {
            setResolvingAction('');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Pressable onPress={() => navigation.openDrawer()} style={styles.headerButton} accessibilityRole="button">
                    <Text style={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamily }}>Menu</Text>
                </Pressable>
                <View style={styles.headerTitle}>
                    <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.fontFamily }]}>Roadie M0</Text>
                    <Text style={[styles.meta, { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }]} numberOfLines={1}>
                        {sessionId || 'No session'} · {runStatus}
                    </Text>
                </View>
                <Pressable
                    onPress={() => void bootstrap()}
                    disabled={loading || sending || runActive || Boolean(resolvingAction)}
                    style={[styles.headerButton, { opacity: loading || sending || runActive || resolvingAction ? 0.5 : 1 }]}
                    accessibilityRole="button"
                >
                    <Text style={{ color: theme.colors.primary, fontFamily: theme.typography.fontFamily }}>Reload</Text>
                </Pressable>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} />
                </View>
            ) : (
                <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
                        {messages.length === 0 && !error ? (
                            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>
                                Canonical Roadie session is ready. Send a message to prove the native round trip.
                            </Text>
                        ) : null}
                        {messages.map((message) => (
                            <View
                                key={message.id}
                                style={[
                                    styles.message,
                                    {
                                        backgroundColor: message.role === 'user' ? theme.colors.primary : theme.colors.surface,
                                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: message.role === 'user' ? theme.colors.onPrimary : theme.colors.text,
                                        fontFamily: theme.typography.fontFamily,
                                    }}
                                >
                                    {message.role === 'tool' ? 'Tool result\n' : ''}
                                    {message.text}
                                </Text>
                            </View>
                        ))}

                        {pendingActions.map((action) => (
                            <View key={action.action_id} style={[styles.action, { borderColor: theme.colors.border }]}>
                                <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily }}>
                                    {action.summary || action.kind || 'Roadie needs approval'}
                                </Text>
                                {pendingPreviewText(action.preview) ? (
                                    <Text style={[styles.preview, { color: theme.colors.textMuted, backgroundColor: theme.colors.surface }]}>
                                        {pendingPreviewText(action.preview)}
                                    </Text>
                                ) : (
                                    <Text style={{ color: theme.colors.error }}>No reviewable preview was provided. Approval is disabled.</Text>
                                )}
                                <View style={styles.actionButtons}>
                                    <Pressable
                                        onPress={() => void decide(action, 'rejected')}
                                        disabled={sending || Boolean(resolvingAction)}
                                        style={[styles.decision, { borderColor: theme.colors.border, opacity: sending || resolvingAction ? 0.5 : 1 }]}
                                    >
                                        <Text style={{ color: theme.colors.text }}>{resolvingAction === action.action_id ? 'Resolving' : 'Reject'}</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => void decide(action, 'accepted')}
                                        disabled={!pendingPreviewText(action.preview) || sending || Boolean(resolvingAction)}
                                        style={[
                                            styles.decision,
                                            {
                                                backgroundColor: theme.colors.primary,
                                                opacity: !pendingPreviewText(action.preview) || sending || resolvingAction ? 0.5 : 1,
                                            },
                                        ]}
                                    >
                                        <Text style={{ color: theme.colors.onPrimary }}>{resolvingAction === action.action_id ? 'Resolving' : 'Approve'}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}

                        {runEvents.length > 0 ? (
                            <View style={[styles.diagnostics, { borderColor: theme.colors.border }]}>
                                <Text style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily }}>
                                    {runEvents.length} canonical run event{runEvents.length === 1 ? '' : 's'} observed
                                </Text>
                            </View>
                        ) : null}

                        {error ? (
                            <Text style={{ color: theme.colors.error, fontFamily: theme.typography.fontFamily }}>{error}</Text>
                        ) : null}
                    </ScrollView>

                    <View style={[styles.composer, { borderTopColor: theme.colors.border }]}>
                        <TextInput
                            value={draft}
                            onChangeText={setDraft}
                            placeholder="Ask Roadie"
                            placeholderTextColor={theme.colors.textMuted}
                            editable={!sending && !runActive && !resolvingAction && Boolean(sessionId)}
                            multiline
                            style={[
                                styles.input,
                                {
                                    color: theme.colors.text,
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                    fontFamily: theme.typography.fontFamily,
                                },
                            ]}
                        />
                        <Pressable
                            onPress={() => void send()}
                            disabled={!draft.trim() || !sessionId || sending || runActive || Boolean(resolvingAction)}
                            style={[styles.send, { backgroundColor: theme.colors.primary, opacity: sending ? 0.6 : 1 }]}
                            accessibilityRole="button"
                        >
                            <Text style={{ color: theme.colors.onPrimary, fontFamily: theme.typography.fontFamily }}>
                                {sending ? 'Working' : 'Send'}
                            </Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    body: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
    headerButton: { width: 72, padding: 16, alignItems: 'center' },
    headerTitle: { flex: 1, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '600' },
    meta: { fontSize: 11, marginTop: 2 },
    messages: { padding: 16, gap: 12 },
    message: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    action: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 },
    actionButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
    preview: { borderRadius: 8, padding: 10, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
    decision: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    diagnostics: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 10 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, padding: 12 },
    input: { flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    send: { minHeight: 44, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
