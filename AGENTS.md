# Agent Instructions (extrachill-app)
## Commands
- Install: `npm install`
- Dev: `npm start` (Expo)
- Run: `npm run ios` / `npm run android` / `npm run web`
- Typecheck: `npx tsc -p tsconfig.json --noEmit` (strict)
- Build: not scripted; use `eas build` (release) or `npx expo export`.
- Lint/format/tests: not configured (no ESLint/Prettier/Jest/Vitest).
- Single test: N/A until a test runner is added.
- Cursor/Copilot rules: none (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md` absent).

## Code Style
- TS strict; avoid `any` (prefer `unknown` + narrowing).
- Imports: React/3rd-party first, then local; use `import type` for types.
- Prefer `@/…` imports for `src/*` (see `tsconfig.json` paths).
- Formatting: 4-space indent, semicolons, single quotes.
- Naming: `PascalCase` components/types; `camelCase` vars/functions; `UPPER_SNAKE_CASE` constants.
- Structure: UI in `src/components/`, screens/routes in `app/` (Expo Router).
- Error handling: throw actionable messages; only swallow when safe.
- Hooks: stable callbacks (`useCallback`); side effects only in `useEffect`.

## ExtraChill API (extrachill-api)
- Base URL (current app default): `https://extrachill.com/wp-json/extrachill/v1` (see `extrachill-app/src/api/client.ts`).
- Auth: JWT access tokens via `Authorization: Bearer <access_token>`.
- Device ID: auth endpoints require `device_id` as UUID v4.
- Source of truth: `extrachill-plugins/extrachill-api/inc/routes/` (implementation) and `extrachill-plugins/extrachill-api/docs/routes/` (route docs).

### Auth Endpoints (used by app)
- `POST /auth/login`
  - Body: `identifier`, `password`, `device_id`, optional `device_name`, `remember`, `set_cookie`.
  - Response (`extrachill-users` token service):
    - `access_token`, `access_expires_at`, `refresh_token`, `refresh_expires_at`
    - `user`: `id`, `username`, `display_name`, `avatar_url`, `profile_url`
- `POST /auth/refresh`
  - Body: `refresh_token`, `device_id`, optional `remember`, `set_cookie`.
  - Response: same shape as `/auth/login`.
- `GET /auth/me`
  - Requires authenticated request (Bearer token resolves WP user).
  - Response includes: `id`, `username`, `email`, `display_name`, `avatar_url`, `profile_url`, `registered`.
  - Note: `profile_url` may be empty string if `ec_get_user_profile_url()` isn’t available.
- `POST /auth/logout`
  - Requires authenticated request.
  - Body: `device_id`.
  - Response: `{ success: boolean, message: string }`.

### Activity Feed Endpoint (used by app)
- `GET /activity`
  - Requires authenticated request.
  - Query params: `cursor` (int), `limit` (int, max 100), `blog_id` (int), `actor_id` (int), `visibility` (`public` default, `private` requires admin), `types[]`.
  - Response shape: `{ items: ActivityItem[], next_cursor: number | null }`.

#### Activity Types + Post Types
- Emitted activity `type` values (current emitters): `post_published`, `post_updated`, `comment_created`.
- Post events are emitted for any post type that transitions to `publish` (except `attachment`). Clients should filter using `item.data.post_type`.
- Post types registered in this repo that you may see in `item.data.post_type`:
  - Core: `post`, `page`
  - CPTs: `artist_profile`, `artist_link_page`, `newsletter`, `ec_doc`, `festival_wire`, `wook_horoscope`, `ec_chat`

### Other Available API Categories
The API plugin exposes additional route groups under the same namespace (not necessarily consumed by this app yet):
- `artists/*`, `users/*`, `community/*`, `chat/*`, `shop/*`, `newsletter/*`, `media/*`, `analytics/*`, `tools/*`, `events/*`, `stream/*`, `contact/*`, `docs/*`, `admin/*`.
