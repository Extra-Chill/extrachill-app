export interface AccessibleAgent {
    slug: string;
    label: string;
    description?: string;
    meta?: Record<string, unknown>;
}

export interface AccessibleAgentsResult {
    agents: AccessibleAgent[];
}

export interface ConversationSession {
    session_id: string;
    title?: string;
    agent_slug?: string;
    messages?: unknown[];
    updated_at?: string;
    [key: string]: unknown;
}

export interface ConversationSessionsResult {
    sessions: ConversationSession[];
}

export interface ConversationSessionResult {
    session: ConversationSession;
}

export interface ChatResult {
    session_id: string;
    reply: string;
    run_id?: string;
    messages?: unknown[];
    completed?: boolean;
    metadata?: Record<string, unknown>;
}

export interface ChatRun {
    run_id: string;
    session_id: string;
    status: string;
    [key: string]: unknown;
}

export interface ChatRunEventsResult extends ChatRun {
    events: unknown[];
    cursor?: string;
    has_more?: boolean;
}

export interface PendingResolutionResult {
    action_id: string;
    decision: string;
    result?: {
        success?: boolean;
        error?: string;
        [key: string]: unknown;
    };
}

export interface PendingAction {
    action_id: string;
    summary?: string;
    kind?: string;
    status?: string;
    preview?: unknown;
    origin?: Record<string, unknown>;
}

export interface DisplayMessage {
    id: string;
    role: 'user' | 'assistant' | 'tool' | 'system';
    text: string;
}
