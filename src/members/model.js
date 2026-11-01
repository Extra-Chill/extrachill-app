export function actorDestination(actor) {
    const id = memberId(actor.user_id);
    if (id !== null) return { kind: 'native', path: `/members/${id}` };
    return actor.profile_url ? { kind: 'browser', url: actor.profile_url } : null;
}

export function supportsAuthorTopics(ability) {
    return Object.prototype.hasOwnProperty.call(ability?.input_schema?.properties ?? {}, 'author_id');
}

// Preserve the server's newest-first order, replacing overlapping topics in place.
export function memberTopicsPage(current, result) {
    return {
        topics: [...new Map([...current, ...result.topics].map(topic => [topic.topic_id, topic])).values()],
        page: result.page,
        hasMore: result.page < result.pages,
    };
}

export function memberId(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function memberRoute(value, ownId) {
    const id = memberId(value);
    return id === null ? null : id === ownId ? '/you' : `/members/${id}`;
}

// Keep server order; overlapping pages replace cards without ranking members.
export function mergeMembers(current, incoming) {
    return [...new Map([...current, ...incoming].filter(row => memberId(row.user_id) !== null).map(row => [Number(row.user_id), row])).values()];
}

export function membersPage(value, page, perPage) {
    const rows = Array.isArray(value.members) ? value.members : [];
    return {
        members: mergeMembers([], rows),
        page,
        hasMore: typeof value.pagination?.total_pages === 'number' ? page < value.pagination.total_pages : rows.length === perPage,
    };
}
