const REPORT_REASONS = Object.freeze([
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'hate', label: 'Hateful content' },
    { value: 'sexual', label: 'Sexual content' },
    { value: 'other', label: 'Other' },
]);

function buildReportInput(target, reason, note = '') {
    const hasPost = target.post_id !== undefined;
    const hasUser = target.user_id !== undefined;
    const id = hasPost ? target.post_id : target.user_id;
    if (hasPost === hasUser || !Number.isInteger(id) || id < 1) throw new Error('Choose exactly one valid report target.');
    if (!REPORT_REASONS.some((item) => item.value === reason)) throw new Error('Choose a reason.');
    if (typeof note !== 'string' || Array.from(note).length > 1000) throw new Error('Notes must be 1000 characters or fewer.');
    return { [hasPost ? 'post_id' : 'user_id']: id, reason, ...(note.trim() ? { note: note.trim() } : {}) };
}

function reportMessage(result, error) {
    if (error) return error.status === 429 || error.data?.status === 429
        ? 'You have sent several reports recently. Please try again later.'
        : 'Your report could not be sent. Please try again.';
    return result?.deduplicated
        ? 'You have already reported this. A moderator will take a look.'
        : 'Thanks, a moderator will take a look.';
}

const moderationAbilities = {
    report: 'extrachill/community-report-content',
    block: 'extrachill/community-block-user',
    unblock: 'extrachill/community-unblock-user',
    list: 'extrachill/community-list-blocked-users',
};

function moderationAvailable(client, ready = true) {
    return Object.fromEntries(Object.entries(moderationAbilities).map(([key, name]) => [key, ready && Boolean(client.describe(name))]));
}

module.exports = { REPORT_REASONS, buildReportInput, reportMessage, moderationAbilities, moderationAvailable };
