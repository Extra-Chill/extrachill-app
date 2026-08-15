const HTML_ENTITIES = {
    amp: '&',
    apos: "'",
    gt: '>',
    hellip: '...',
    lt: '<',
    nbsp: ' ',
    quot: '"',
};

export function plainText(value) {
    if (typeof value !== 'string') return '';

    return value
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\/(p|div|li|blockquote|h[1-6])>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, code) => {
            const radix = code[0].toLowerCase() === 'x' ? 16 : 10;
            const number = Number.parseInt(radix === 16 ? code.slice(1) : code, radix);
            return Number.isFinite(number) && number >= 0 && number <= 0x10ffff
                ? String.fromCodePoint(number)
                : '';
        })
        .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITIES[name.toLowerCase()] ?? match)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function plainTextToHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\r?\n/g, '<br>');
}

export function displayDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function forumRows(forums) {
    const byParent = new Map();
    for (const forum of forums) {
        const siblings = byParent.get(forum.parent_id) ?? [];
        siblings.push(forum);
        byParent.set(forum.parent_id, siblings);
    }

    const rows = [];
    const append = (parentId, depth, seen) => {
        for (const forum of byParent.get(parentId) ?? []) {
            if (seen.has(forum.forum_id)) continue;
            rows.push({ ...forum, depth });
            append(forum.forum_id, depth + 1, new Set([...seen, forum.forum_id]));
        }
    };
    append(0, 0, new Set());

    for (const forum of forums) {
        if (!rows.some((row) => row.forum_id === forum.forum_id)) {
            rows.push({ ...forum, depth: 0 });
        }
    }
    return rows;
}

export function mergeReplies(current, incoming) {
    const replies = new Map(current.map((reply) => [reply.reply_id, reply]));
    for (const reply of incoming) replies.set(reply.reply_id, reply);
    return [...replies.values()].sort((left, right) => {
        const dateOrder = new Date(left.date).getTime() - new Date(right.date).getTime();
        return dateOrder || left.reply_id - right.reply_id;
    });
}

export function communityError(error) {
    const status = typeof error?.status === 'number' ? error.status : 0;
    const code = typeof error?.code === 'string' ? error.code : '';
    if (status === 401 || status === 403) {
        return { kind: 'permission', message: 'This conversation is not available to your account.' };
    }
    if (status === 404 || code.includes('not_found') || code.includes('not_published')) {
        return { kind: 'not-found', message: 'This conversation is private, unavailable, or no longer exists.' };
    }
    return {
        kind: 'retry',
        message: error instanceof Error ? error.message : 'Community could not be loaded. Try again.',
    };
}
