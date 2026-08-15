import type { WPNativeClient } from 'wp-native-client';
import type {
    AccessibleAgentsResult,
    ChatResult,
    ChatRun,
    ChatRunEventsResult,
    ConversationSessionResult,
    ConversationSessionsResult,
    PendingAction,
    PendingResolutionResult,
} from './types';

export const ROADIE_AGENT = 'roadie';

export function listAccessibleAgents(client: WPNativeClient): Promise<AccessibleAgentsResult> {
    return client.execute('agents/list-accessible-agents', { minimum_role: 'viewer' });
}

export function listRoadieSessions(client: WPNativeClient): Promise<ConversationSessionsResult> {
    return client.execute('agents/list-conversation-sessions', {
        agent: ROADIE_AGENT,
        limit: 20,
    });
}

export function createRoadieSession(client: WPNativeClient): Promise<ConversationSessionResult> {
    return client.execute('agents/create-conversation-session', { agent: ROADIE_AGENT });
}

export function getRoadieSession(client: WPNativeClient, sessionId: string): Promise<ConversationSessionResult> {
    return client.execute('agents/get-conversation-session', {
        agent: ROADIE_AGENT,
        session_id: sessionId,
    });
}

export function sendRoadieMessage(
    client: WPNativeClient,
    sessionId: string,
    runId: string,
    message: string,
): Promise<ChatResult> {
    return client.execute('agents/chat', {
        agent: ROADIE_AGENT,
        session_id: sessionId,
        run_id: runId,
        message,
        client_context: {
            source: 'rest',
            client_name: 'extrachill-app',
        },
    });
}

export function getRoadieRun(
    client: WPNativeClient,
    sessionId: string,
    runId: string,
): Promise<ChatRun> {
    return client.execute('agents/get-chat-run', {
        agent: ROADIE_AGENT,
        session_id: sessionId,
        run_id: runId,
    });
}

export function listRoadieRunEvents(
    client: WPNativeClient,
    sessionId: string,
    runId: string,
): Promise<ChatRunEventsResult> {
    return client.execute('agents/list-chat-run-events', {
        agent: ROADIE_AGENT,
        session_id: sessionId,
        run_id: runId,
        limit: 100,
    });
}

export function resolveRoadiePendingAction(
    client: WPNativeClient,
    action: PendingAction,
    decision: 'accepted' | 'rejected',
    userId: number,
): Promise<PendingResolutionResult> {
    return client.execute('agents/resolve-pending-action', {
        agent: ROADIE_AGENT,
        action_id: action.action_id,
        decision,
        resolver: `user:${userId}`,
        context: {
            roadie_origin: action.origin ?? {},
        },
    });
}
