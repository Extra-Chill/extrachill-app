# Network Search

The Search drawer screen uses the main authenticated client to execute
`extrachill/multisite-search`. Queries are trimmed, require two characters, and
wait 300 ms before requesting up to 50 published results. Results retain server
ordering within first-seen site groups (falling back to content type). The app
does not add scores, popularity rankings, or engagement metadata.

Recent queries are held in module memory, capped at five, and are never written
to persistent storage. They disappear when the app process/session restarts.
In-flight responses are ignored when the query changes or the screen unmounts.

## Routing

- Community `topic` results use `/community/topic/<id>`.
- `event` and `tribe_events` results use `/calendar/event/<id>`.
- Other results with HTTP(S) permalinks use the shell browser handoff.
- Missing or unsafe permalinks have no link action.

## Follow-ups / PR notes

- This checkout has no Calendar detail screen. The event destination follows the
  agreed Calendar contract; end-to-end event navigation requires that screen.
- Search currently displays the first 50 results; pagination can follow.
- Device smoke testing and validation against live ability responses remain.

## Validation

`npm run typecheck` and `npm test` pass. Model tests cover response shapes,
order-preserving groups, native/browser destinations, unsafe links, query
normalization, and bounded in-memory history.
