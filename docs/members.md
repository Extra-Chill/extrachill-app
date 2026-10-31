# Members

`/members` is People in your scene, reachable from Community and the drawer. `/members/<userId>` is a public native profile. Names in Community forum topics, topic details, replies, and Inbox actor rows open profiles; your own name opens You. The directory preserves the server's alphabetical display-name order and merges overlapping pages by user ID. It never displays rank or points.

## Clients and contracts

- `src/members/client.ts` reuses You's typed `extrachill/get-user-profile` client on the primary root. Profiles show avatar, display name, title, public city, bio and safe HTTP(S) links via browser handoff.
- `extrachill/local-scene-members` runs on the primary root with `{ slug, page, per_page: 25 }`. Cards use `user_id`, `display_name`, `avatar_url`, and `custom_title`; pagination uses `pagination.total_pages` (not top-level pages). The upstream ability orders by display_name ASC. Its rank field is deliberately ignored.
- The market comes from Calendar's `defaultLocation(client)`, including canonical resolution. Focus and refresh re-read it; no market offers a Calendar link rather than guessing a scene.
- Profiles reuse Community's `ModerationActions` on the derived Community client. An absent post ID reports `{ user_id }`; existing post actions still report `{ post_id }`. Own-profile actions are hidden and replaced with a You link. Successful blocking leaves the profile.
- Request generations discard stale directory and profile responses. Directory supports loading, refresh, retry, empty/no-market and load-more states.

## Contract verification and follow-ups

Unauthenticated requests to the live primary and Community `/wp-json/wp-abilities/v1/abilities` indexes returned HTTP 401 `rest_forbidden`. Checked current server source instead: `extrachill-users/inc/core/abilities/{user-profile,local-scene-members,notifications}.php`, `inc/notifications/service.php`, and `extrachill-community/inc/content/topic-reply-abilities.php`.

`community-list-topics` accepts only forum_id, per_page, page, orderby and order, with additionalProperties false. No supported per-author topic list was found. Profiles intentionally omit recent activity; follow up when a per-author chronological ability exists. No broad-feed client-side filtering or leaderboard call is used.

Inbox's network service enriches notifications with `actor_id` and `actor_display_name`. These optional fields now render a separate profile link without marking a notification read or opening its target. Older notifications without actor data retain their existing target behavior. No avatar is returned in the existing Community author or Inbox contracts; the directory/profile use the real returned avatars, with no speculative per-row profile requests.

Community home activity cards still expose only `actor.display_name` and `actor.profile_url`, not a numeric user ID. Their existing canonical browser handoff is retained. Native author routing for these summary cards needs an actor ID in the server contract; names must not be guessed into user IDs. Authenticated device smoke testing (including report/block permissions) remains a follow-up.

## Validation

`npm run typecheck` and `npm test`. Model tests cover invalid route IDs, own-profile routing, overlap merging without ranking, and the server's nested pagination, including empty final pages. Versions and CHANGELOG are release-owned and unchanged.
