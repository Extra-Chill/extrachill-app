# Native You surface (#77)

The authenticated drawer's You section uses the main site's ability client (no derived root). Profile, profile editing, name settings, notification digest preferences, email verification requests, password changes, and paginated upcoming/past shows are native screens. Returning to You reloads profile data after edits. Pagination preserves server chronology and deduplicates overlaps; stale list requests are ignored.

Account deletion is hidden unless `client.describe('extrachill/delete-my-account')` returns a descriptor. The confirmation route checks capability again, requires the exact text `DELETE`, executes the ability, then logs out. Failed deletion keeps the session intact. A logout retry is available if deletion succeeds but session cleanup fails.

## Validation

- `npm run typecheck`
- `npm test` (including URL safety, chronological pagination merging, password validation, deletion confirmation, and error helpers)

## Follow-up / integration checks

- Calendar owns `/calendar/event/<eventId>`; this change links to that contract but does not implement the destination.
- The deletion ability is server-owned and not yet available. Verify its eventual input schema before enabling it in the server catalog; this implementation sends an empty object after local confirmation.
- Authenticated device smoke testing against live abilities (including email verification delivery, password/session behavior, browser handoff, and destructive deletion) remains a release integration check; no live credentials were used here.
- Link and avatar editing are outside this slice; public links are displayed and handed to the browser.

Version and CHANGELOG are release-owned and unchanged.
