# Inbox (#78)

Network abilities use the authenticated main client; no derived site client or new allowed root is needed. Inbox supports newest-first pagination, All/Unread filters, pull-to-refresh, per-row read-before-open and mark-all-read. The drawer and Home share the unread count, refreshed on foreground transitions with a 60-second throttle. Explicit read mutations reconcile the badge immediately (not polling).

URL routing deliberately requires an exact network host and a numeric topic/event path. Slug-only permalinks and other URLs use browser handoff rather than guessing a WordPress ID.

## Validation

- `npm run typecheck`
- `npm test` (including routing, read flags, chronological deduplication and focus-throttle model tests)

## PR follow-ups / limitations

- Event notifications route to `/calendar/event/[eventId]`, which the Calendar PR (#76) owns. Merge Calendar first; until then that route doesn't exist.
- Resolve slug-only topic/event permalinks to IDs when the server exposes a URL-resolution contract; currently these safely hand off to the browser.
- Device/live-account verification of pagination, foreground refresh, read mutations and browser handoff remains to be performed. No push delivery is included.

Version and CHANGELOG are intentionally unchanged.
