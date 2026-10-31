# Calendar first slice (#76)

## Shipped

Calendar drawer section, Tonight / This weekend / This week / Upcoming chips,
chronological server date groups, paged SectionList, pull-to-refresh, location
search, and list-to-detail navigation at `/calendar/event/[eventId]`. Attendance
is plain text; Going uses the server's mark state with serialized mutations.
All server requests are abilities via the authenticated client. Calendar and
attendance run on the allowlisted Events-derived client. Account settings and
user-event-locations run on the main client.

## Contracts checked

Source checked in Extra-Chill/extrachill-events:
`inc/abilities/events-calendar.php`, `inc/abilities/events-get-venue.php`.
The calendar adapter supplies `id`, `title`, `datetime`, `end_datetime`, `venue`,
`performer`, `occurrence_display`, `ticket_url`, and `permalink`. It does not
supply a description. The screen uses performer.name, or offers the canonical
web page for the full description. Display time is the server's
`occurrence_display.formatted_time_display` plus `venue.timezone`; the fallback
is the unparsed venue-local datetime, never converted to the device timezone.

Extra-Chill/data-machine-events `contracts/calendar-occurrence-v1.json`
confirms performer.name and the formatted display time. Multi-day occurrences
remain separate rows across dates, deduplicated only within each date.

Extra-Chill/extrachill-users `inc/core/abilities/user-settings.php` and
`user-event-locations.php` confirm that `user-event-locations` resolve requires
an explicit slug: it does not return the current preference by itself.
`get-user-settings.default_event_location.slug` supplies that slug, then the
resolver canonicalizes it. No preference shows all events and the picker.
Preference errors are visible and also fall back to all. Picker selection is
session-local, not an account-settings mutation.

Live unauthenticated ability discovery returned HTTP 401. No authenticated
server/device smoke test was available; optional payload fields are not
fabricated and no direct REST requests are used by the app.

## Follow-up / partial delivery

- Bare-ID deep links after a cold launch cannot yet hydrate event details.
  No event-by-ID ability was verified. Query-events' documented structured
  output only supplies event_id, title, permalink and datetimes; it has no ID
  selector or venue/lineup/ticket fields. The app retains actual calendar
  payloads in an in-memory cache. List navigation works; uncached deep links
  show an explicit explanation and Browse Calendar action. Add a verified
  event-detail ability, then replace this cache-only fallback without changing
  the contracted route.
- Verify authenticated ability availability, default preference resolution,
  attendance permissions, pagination, and browser handoff on a device.
- Full description and end-time presentation remain web handoffs/follow-ups;
  no unsupported description field has been invented.

Validation: `npm run typecheck`, `npm test` (includes model helper tests).
Release-owned version and changelogs are unchanged.
