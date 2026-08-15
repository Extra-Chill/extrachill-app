function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function textFromContent(content) {
    if (typeof content === 'string') {
        return content.trim();
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .map((part) => {
            const record = asRecord(part);
            return record && typeof record.text === 'string' ? record.text.trim() : '';
        })
        .filter(Boolean)
        .join('\n');
}

function normalizeMessages(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages.flatMap((message, index) => {
        const record = asRecord(message);
        if (!record) {
            return [];
        }

        const messageType = typeof record.type === 'string' ? record.type : '';
        const isToolMessage = messageType.includes('tool')
            || typeof record.tool_call_id === 'string'
            || typeof record.tool_name === 'string';
        const role = isToolMessage
            ? 'tool'
            : ['user', 'assistant', 'tool', 'system'].includes(record.role)
                ? record.role
                : 'system';
        const text = textFromContent(record.content)
            || (typeof record.text === 'string' ? record.text.trim() : '')
            || (typeof record.message === 'string' ? record.message.trim() : '');
        if (!text) {
            return [];
        }

        return [{
            id: typeof record.id === 'string' ? record.id : `${role}-${index}`,
            role,
            text,
        }];
    });
}

function pendingOrigin(record) {
    const explicit = asRecord(record.origin);
    if (explicit) {
        return explicit;
    }

    const origin = {};
    for (const key of ['workspace', 'context', 'metadata']) {
        const value = asRecord(record[key]);
        if (value) {
            origin[key] = value;
        }
    }
    return Object.keys(origin).length > 0 ? origin : undefined;
}

function findPendingActions(value) {
    const actions = [];
    const seen = new Set();

    function visit(candidate, inheritedOrigin, allowed = true) {
        if (!candidate || typeof candidate !== 'object') {
            return;
        }
        if (seen.has(candidate)) {
            return;
        }
        seen.add(candidate);

        if (Array.isArray(candidate)) {
            candidate.forEach((item) => visit(item, inheritedOrigin, allowed));
            return;
        }

        const record = candidate;
        const origin = pendingOrigin(record) || inheritedOrigin;
        if (allowed && typeof record.action_id === 'string' && record.action_id) {
            const status = typeof record.status === 'string' ? record.status : undefined;
            const approvalRequired = record.type === 'approval_required';
            const canonicalPendingAction = status === 'pending'
                && typeof record.kind === 'string'
                && typeof record.summary === 'string'
                && Object.prototype.hasOwnProperty.call(record, 'preview');
            if (approvalRequired || canonicalPendingAction) {
                actions.push({
                    action_id: record.action_id,
                    summary: typeof record.summary === 'string' ? record.summary : undefined,
                    kind: typeof record.kind === 'string' ? record.kind : undefined,
                    status,
                    preview: record.preview,
                    origin,
                });
            }
        }

        for (const key of ['payload', 'result', 'metadata', 'tool_calls', 'messages', 'raw']) {
            if (key in record) {
                visit(record[key], origin, true);
            }
        }
    }

    visit(value, undefined);
    return actions.filter((action, index) => (
        actions.findIndex((candidate) => candidate.action_id === action.action_id) === index
    ));
}

function isTerminalRunStatus(status) {
    return [
        'approval_required',
        'budget_exceeded',
        'cancelled',
        'completed',
        'failed',
        'interrupted',
        'stalled',
    ].includes(status);
}

function pendingPreviewText(preview) {
    if (typeof preview === 'string') {
        return preview.trim();
    }
    if (preview === undefined || preview === null) {
        return '';
    }

    try {
        return JSON.stringify(preview, null, 2);
    } catch {
        return '';
    }
}

module.exports = {
    findPendingActions,
    isTerminalRunStatus,
    normalizeMessages,
    pendingPreviewText,
    textFromContent,
};
