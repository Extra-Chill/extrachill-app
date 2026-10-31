# Native Community moderation

Community is already registered in `extrachill.config.ts`, and its REST root is allowlisted. Moderation uses that derived client, not the main-site client. Report, block, unblock, and blocked-list UI are independently gated by `describe()`; no moderation abilities are required for older servers.

Topics (room lists and detail) and replies expose private actions for other members only. Reports accept the five server reasons and an optional 1000-character note. Duplicate reports and rate limits have calm messages. Blocking requires confirmation and reloads the visible content. Community/room/topic screens also reload on focus so returning from a block or unblock does not retain stale lists.

`moderation.ts` is the typed public entry. Screens import `moderation-client.ts` explicitly because Metro can prefer an adjacent `.js` file over `.ts`. `moderation.js` is the Node entry for pure model tests; shared runtime helpers live in `moderation-model.js`.

## Validation

- `npm run typecheck`
- `npm test` (including moderation reasons, exact-one-target validation, note bounds, and result/error messages)

## Follow-up / release QA

- Verify on iOS against the deployed server abilities from Extra-Chill/extrachill#453, including deduplicated reports, HTTP 429, partial ability availability, and server-side block filtering. Live-server/device testing was not performed here.
- No profile moderation screen is added: member-target reporting is supported by the typed model/client for a future native profile surface.
- Version and CHANGELOG are release-owned and unchanged.
