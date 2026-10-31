# Native Stories

Stories uses the authenticated main-site client, without deriving another REST root.
The config-driven drawer hides Stories unless `client.describe('extrachill/list-stories')`
returns a descriptor. Direct routes also show an unavailable state before rollout.

The list requests the server's newest-first default and merges pages by ID. Refresh
replaces the list; failed refreshes preserve existing cards and retry page one.
The contracted `/stories/<id>` route is also recognized by the existing notification
URL mapper. Slug publication permalinks continue to use browser handoff.

## Reader choice

There was no HTML renderer dependency. The reader adds Expo-compatible
`react-native-webview` (13.15.0) and uses a theme-colored document with JavaScript,
DOM storage, file access and shared/third-party cookies disabled. A restrictive CSP
blocks scripts, forms, frames and external styles; HTTPS images are permitted.
Links leave the reader through browser handoff. Metadata, term labels, browser and
platform share controls remain native, above the independently scrolling reader.

## Validation and follow-up

- `npm run typecheck`
- `npm test` (includes date, excerpt, merge, reader policy and notification routing tests)
- Follow-up: device QA against the server abilities once Extra-Chill/extrachill#451
  is deployed, including missing stories, embedded-media fallback, image-heavy
  articles, theme switching, VoiceOver/TalkBack and platform share sheets.
- Embedded players are intentionally blocked in the sandbox; use “Open on
  extrachill.com” for interactive media. Taxonomy chips are labels only.
- Native WebView installation requires a new native build. No web reader is added.

Version and CHANGELOG are release-owned and unchanged.
