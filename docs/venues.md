# Native venues

Calendar is the drawer section (already registered in `extrachill.config.ts`). Its **Venues near you** entry opens `/calendar/venues`. Event detail's venue name opens `/calendar/venue/<venueId>`; numeric term IDs are preferred, with slug/name fallback when the event payload does not include a term ID. No venue data is reconstructed from URL parameters.

## Client and contracts

`src/venues/client.ts` uses `client.execute` on the events-site client derived from `EVENTS_REST_ROOT`. That root is already in `api.allowedBaseUrls`. It calls:

- `data-machine-events/list-venues`: market lat/lng, 25-mile radius when coordinates exist; otherwise fetch the venue directory for local name/address search. The server contract has no name-search input.
- `extrachill/events-calendar` with `venue: <slug>`, `past: false`, `page`: the same public calendar the Calendar tab uses. It's upcoming-only, chronological and paginated (`has_more`). `venue_id` is reserved for authorized venue managers, so the app filters by slug.
- `data-machine-events/get-venue-events` (`limit: 1`): only used to resolve a name/slug link to a term ID when an event payload lacks the venue ID.
- `data-machine-events/get-venue`: full details by resolved term ID.

Browse uses the Calendar's selected market, or the existing default-location resolver when opened directly. Coordinates accept `lat`/`lng` or `latitude`/`longitude`; missing coordinates are explicitly disclosed and fall back to alphabetical name/address search, not device location or guessed coordinates. Proximity results sort by distance, then name; directory search sorts by name. Event counts never determine ranking.

## Venue detail

Name, address, description, Directions and website use the existing Calendar/Community theme and components. Directions opens Apple Maps on iOS or Google Maps elsewhere via React Native `Linking`; website uses shell browser handoff and only accepts HTTP(S). Link failures are visible.

Upcoming shows come from the public calendar grouped by date, the same as Calendar. They use the same time formatting, and "More shows" pages through `has_more`. Taps open native event detail, which is instant because the rows are remembered in the event cache.

Screens have loading, empty, retry, pull-to-refresh and stale-response guards.

## Validation

`npm run typecheck` and `npm test`. `src/venues/model.test.js` covers identity fallback, maps/address formatting, market coordinates and non-popularity directory ordering/search. Device-level map/browser handoff and live authenticated ability responses still need a manual smoke test. Version and CHANGELOG are release-owned and unchanged.
