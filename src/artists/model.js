import { plainText } from '../community/model.js';

export function artistId(value) {
    return typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}
function webUrl(value) {
    if (typeof value !== 'string') return '';
    try { return ['https:', 'http:'].includes(new URL(value).protocol) ? value : ''; } catch { return ''; }
}
export function linkPageUrl(slug) {
    return typeof slug === 'string' && slug.trim() ? `https://extrachill.link/${encodeURIComponent(slug)}` : '';
}
export function manageArtistUrl(id) {
    return `https://artist.extrachill.com/manage-artist/?artist_id=${id}`;
}
// Preserve the editor's section/link order, never sort by click counts.
export function linkPageLinks(data) {
    const source = data?.link_sections ?? data?.links;
    if (!Array.isArray(source)) return [];
    return source.flatMap((item) => Array.isArray(item?.links) ? item.links : [item]).flatMap((link) => {
        const url = webUrl(link?.link_url);
        return url ? [{ url, label: plainText(link.link_text) || url }] : [];
    });
}
function count(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}
export function analyticsSummary(data) {
    return {
        views: count(data?.summary?.total_views), clicks: count(data?.summary?.total_clicks),
        links: Array.isArray(data?.top_links) ? data.top_links.filter((link) => link && typeof link === 'object').map((link) => ({
            label: plainText(link.text) || plainText(link.identifier) || 'Link', clicks: count(link.clicks),
        })).sort((a, b) => a.label.localeCompare(b.label)) : [],
    };
}
