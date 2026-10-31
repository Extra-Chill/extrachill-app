# Private show ratings

Members can rate shows they marked Going, after the show has ended:

- Calendar → event detail: five stars appear only when the attendance ability returns `timing: past` and `user_marked: true`.
- You → My Shows → Past: ratings appear inline. “Rate your recent shows” offers up to five unrated shows from the loaded history, most recent first. Load more shows to extend that history. No ranking or public rating totals are introduced.
- Tap a star to set 1–5; tap the selected star again to clear. Changes appear immediately, save controls are locked per event, and failed saves restore the previous rating with an inline retry message.
- Ratings reload on My Shows focus, pull-to-refresh, and event-detail refresh. Read failures have a retry action and do not enable writes against an unknown rating.

## Contract and website comparison (PR rationale)

The two server systems are separate, not interchangeable:

- `extrachill-users/inc/core/abilities/concert-tracking.php` delegates `extrachill/rate-show` and `extrachill/get-my-show-ratings` to `inc/concert-tracking/service.php`. Ratings live on the current user's attendance record, require an attended past show, accept zero to clear, and disappear when attendance is removed.
- The website's `extrachill-events/blocks/concert-stats/src/components/ShowRating.js` and `hooks/useMyRatings.js` use precisely those private abilities, including the same-star-to-clear behavior and optimistic rollback. This is the member's personal My Shows rating flow reproduced here.
- Data Machine Events `inc/Abilities/EventRatingAbilities.php` and `inc/Core/EventRatings.php` instead store `event_review` comments and `_dme_rating` comment metadata, with approved public reviews, aggregates, and optional written text. Its event-page comment form exposes that distinct public review flow. A private rating must never write a public review as a side effect.

The app therefore uses **only the private abilities** for v1.1. Public reviews, including their text, remain available through the existing event “Open event on web” browser handoff; native public review rendering/editing is a follow-up, not part of this private control.

## Implementation

`src/show-ratings/client.ts` executes typed abilities on the authenticated main client. Reads deduplicate IDs and batch at 100. No extra API root or drawer destination is needed: Calendar and You are already registered in `extrachill.config.ts`.

`model.js` / `model.d.ts` contain pure eligibility, toggle, and chronological prompt ordering helpers. Event eligibility uses server timing, never device-time parsing of venue-local datetime strings. My Shows uses the server's `period: past` attended history. The server remains authoritative on every write.

`components.tsx` owns screen-local snapshots, per-event pending locks, optimistic updates, rollback, accessible star labels, and load/retry states. Async results are generation-guarded when the owner, client, or event set changes. No ratings are persisted in a global cache.

## Validation and follow-up

Run `npm run typecheck` and `npm test`. Unit tests cover past-and-attended eligibility, all five star toggles and clears, invalid star input, and unrated-first/newest-first ordering without mutating history.

Follow-up: native public reviews and device-level interaction testing (network failure, screen-reader announcements, and cross-screen refresh) are not included. The prompt deliberately covers loaded paginated history rather than fetching an entire concert history eagerly. Version and CHANGELOG remain release-owned.
