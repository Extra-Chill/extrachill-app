import { plainText } from '../community/model.js';

// Expo Router can supply repeated query parameters as arrays. Only accept known
// sources; never turn a route parameter into an arbitrary network destination.
export function storySource(source, host) {
    const value = Array.isArray(source) ? source[0] : source;
    if (value === 'main' || value === 'wire') return value;
    const siteHost = Array.isArray(host) ? host[0] : host;
    return typeof siteHost === 'string' && siteHost.toLowerCase() === 'wire.extrachill.com' ? 'wire' : 'main';
}
export function storyRouteParams(item, source) {
    return { storyId: String(item.id), source: storySource(source, item.site?.host), host: item.site?.host };
}
export function cleanExcerpt(value) {
    return plainText(value).replace(/\s+/g, ' ').trim();
}
export function displayDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
}
export function mergeStories(previous, incoming) {
    const rows = new Map(previous.map(item => [item.id, item]));
    incoming.forEach(item => rows.set(item.id, item));
    return [...rows.values()].sort((a, b) => {
        const aDate = Date.parse(a.date) || 0;
        const bDate = Date.parse(b.date) || 0;
        return bDate - aDate || b.id - a.id;
    });
}
export function storyError(error) {
    return error?.code === 'story_not_found' ? 'This story is no longer available.' : 'Unable to load Stories. Please try again.';
}

// No scripts, forms, embeds or external styles are allowed in the reader.
// CSP also blocks inline event handlers and network requests other than HTTPS images.
export function readerDocument(content, colors) {
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'"><style>body{background:${colors.background};color:${colors.text};font:18px/1.6 system-ui,sans-serif;margin:16px;overflow-wrap:anywhere}a{color:${colors.primary}}img{max-width:100%;height:auto}figure{margin:16px 0}pre{white-space:pre-wrap}iframe,script,form,object,embed{display:none}</style></head><body>${content}</body></html>`;
}
