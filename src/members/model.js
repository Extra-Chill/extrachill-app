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
