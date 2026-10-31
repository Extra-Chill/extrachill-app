export function safeLinks(links) {
    if (!Array.isArray(links)) return [];
    return links.filter((link) => {
        try { return ['https:', 'http:'].includes(new URL(link.url).protocol); } catch { return false; }
    });
}

// Preserve the server's chronological order, replacing overlaps between pages.
export function mergeShows(current, incoming) {
    return [...new Map([...current, ...incoming].map((show) => [show.event_id, show])).values()];
}

export function deletionConfirmed(available, confirmation) {
    return available === true && confirmation === 'DELETE';
}

export function passwordError(current, password, confirm) {
    if (!current) return 'Enter your current password.';
    if (password.length < 8) return 'Use at least 8 characters for your new password.';
    if (password !== confirm) return 'New passwords do not match.';
    return '';
}

export function youError(error) {
    return error instanceof Error ? error.message : 'Unable to complete this request. Try again.';
}
