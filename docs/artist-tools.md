# Artist tools (read-only)

My Artists lives in the existing **You** drawer section (`navigation.sections` in `extrachill.config.ts`). Memberships load on focus and when You is refreshed. An empty membership response renders nothing: no heading, upsell or creation prompt. Membership failures have their own retry, without blocking profile or shows.

`/you/artists/<artistId>` checks the signed-in user's memberships before reading the profile or requesting private link-page data. Server permission checks remain authoritative. Focus/refresh clears old data; generation guards discard stale responses after navigation, account changes or overlapping requests. No private analytics are persisted or placed in route parameters.

## Transport

All reads use `useSiteClient(ARTIST_REST_ROOT)` from `src/network/site-client.ts`, which caches derived clients and discovers their ability catalogs per shell client and site root, where the root is `https://artist.extrachill.com/wp-json/`, explicitly allowlisted in app config. The typed wrappers in `src/artists/client.ts` call only WordPress abilities:

- `extrachill/get-user-artists`: `{ user_id }`
- `extrachill/artist-get`: `{ id }`
- `extrachill/get-link-page-data`: `{ artist_id }`
- `extrachill/artist-get-analytics`: `{ id, date_range: 30 }`
- `extrachill/get-link-page-analytics`: `{ link_page_id, date_range: 30 }` (fallback when artist analytics fails)

An artist without a link page still has a usable profile and web edit action. Link-page and analytics failures do not hide a successfully loaded profile; retry reloads the surface. Missing counts display “Unavailable,” not zero.

## Display contracts

`model.js` normalizes sectioned `link_sections` / `links` and legacy flat `links`, reading `link_text` and `link_url`. Only absolute HTTP(S) destinations are tappable, preserving editor order. Analytics use `summary.total_views`, `summary.total_clicks`, and `top_links[].{text,identifier,clicks}`. The per-link list is alphabetical, not a popularity ranking. Stats are labeled private and last 30 days; no charts, public counts or engagement mechanics are added.

The public URL uses the artist slug at `https://extrachill.link/<slug>`, matching the artist platform's path-based URL fallback. Share uses React Native's native share sheet. Web actions use the existing shell browser handoff. Edit opens `https://artist.extrachill.com/manage-artist/?artist_id=<id>`; the web manager also offers its artist switcher if its selected artist preference takes precedence.

## Verification and follow-ups

Run `npm run typecheck` and `npm test`. Model tests cover route validation, URL construction, link normalization/safety/order, malformed data and analytics counts/order.

Device acceptance: sign in as a member with no artists (no entry), then as an owner with artists; open a profile, refresh, tap a link, share, and use Edit on the web. Check a no-link-page artist and denied/revoked membership. A live authenticated owner session and native share/browser-handoff smoke test are not available in automated model tests.

Editing, roster management, custom analytics windows and link-page styling remain web-only follow-ups. Release version and CHANGELOG are intentionally unchanged.
