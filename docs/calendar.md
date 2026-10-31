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
supply a description. Detail lookup uses the public
`data-machine-events/get-event` ability on the Events-derived client with
`{ event_id }`, returning the same occurrence fields plus `content_html`.
The screen renders that description with Community's existing `plainText`
HTML-to-native-text helper and retains the canonical web handoff.
Display time is the server's
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

Event detail supports bare IDs from Inbox, Search, deep links and cold starts.
Cached list rows display immediately and refresh from `get-event`; uncached
IDs show a loading state. Missing events clear stale details and offer Browse
Calendar; transient errors allow retry and preserve any cached row. Feature
detection via `client.describe` retains cached-only behavior on older servers
without the detail ability.

- Verify authenticated ability availability, default preference resolution,
  attendance permissions, pagination, and browser handoff on a device.
- End-time presentation and rich HTML formatting remain web handoffs/follow-ups.

Validation: `npm run typecheck`, `npm test` (includes model helper tests).
Release-owned version and changelogs are unchanged.
