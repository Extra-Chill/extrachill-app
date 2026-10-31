export function normalizeQuery(value) {
    return value.trim().replace(/\s+/g, ' ');
}

export function searchResults(response) {
    return Array.isArray(response) ? response : response.results;
}

// Map insertion order preserves both the server's group order and relevance order.
export function groupResults(results) {
    const groups = new Map();
    for (const result of results) {
        const key = result.site_url || result.site_name || result.post_type || 'Results';
        if (!groups.has(key)) groups.set(key, { key, title: result.site_name || result.site_url || result.post_type || 'Results', results: [] });
        groups.get(key).results.push(result);
    }
    return [...groups.values()];
}

export function resultDestination(result) {
    let host = '';
    try {
        const site = result.site_url || result.permalink || '';
        host = new URL(site.includes('://') ? site : `https://${site}`).hostname;
    } catch { /* Unknown sources use the browser fallback. */ }
    const validId = Number.isSafeInteger(result.ID) && result.ID > 0;
    if (validId && result.post_type === 'topic' && host === 'community.extrachill.com') {
        return { kind: 'native', path: `/community/topic/${result.ID}` };
    }
    if (validId && ['tribe_events', 'event'].includes(result.post_type)) {
        return { kind: 'native', path: `/calendar/event/${result.ID}` };
    }
    // Never hand arbitrary protocols from search data to the browser.
    try {
        const url = new URL(result.permalink);
        if (['https:', 'http:'].includes(url.protocol)) return { kind: 'browser', url: url.href };
    } catch { /* A missing permalink is not actionable. */ }
    return { kind: 'unavailable' };
}

export function rememberQuery(recent, query) {
    const normalized = normalizeQuery(query);
    if (normalized.length < 2) return recent;
    return [normalized, ...recent.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
}
