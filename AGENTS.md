# Agent Instructions (extrachill-app)

## Commands
- Install: `npm install`
- Dev: `npm start` (Expo)
- Run: `npm run ios` / `npm run android` / `npm run web`
- Typecheck: `npx tsc -p tsconfig.json --noEmit` (strict)
- Build: not scripted; use `eas build` (release) or `npx expo export`.
- Lint/format/tests: not configured (no ESLint/Prettier/Jest/Vitest).
- Single test: N/A until a test runner is added.

## Code Style
- **TypeScript**: Strict mode enabled; avoid `any` (prefer `unknown` with narrowing).
- **Imports**: React/3rd-party first, then local; use `import type` for type-only imports.
- **Paths**: Prefer `@/…` imports for `src/*` (configured in `tsconfig.json` paths).
- **Formatting**: 4-space indent, semicolons, single quotes.
- **Naming**: `PascalCase` components/types; `camelCase` variables/functions; `UPPER_SNAKE_CASE` constants.
- **Structure**: UI components in `src/components/`; screens/routes in `app/` (Expo Router file-based routing).
- **Error handling**: Throw actionable error messages; only swallow exceptions when safe and intentional.
- **Hooks**: Use `useCallback` for stable callbacks; side effects only in `useEffect`.

## ExtraChill API Integration

**Base URL**: `https://extrachill.com/wp-json/extrachill/v1` (configured in `src/api/client.ts`).

**Authentication**: JWT access tokens via `Authorization: Bearer <access_token>` header.

**Device Tracking**: All auth endpoints require `device_id` as UUID v4 for multi-device session management.

**Source of Truth**:
- Implementation: `extrachill-plugins/extrachill-api/inc/routes/`
- Documentation: `extrachill-plugins/extrachill-api/docs/routes/`

### Endpoints Consumed by Mobile App

#### Authentication Endpoints

**POST /auth/login**
- Body: `identifier`, `password`, `device_id`, optional `device_name`, `remember`, `set_cookie`
- Response: `{ access_token, access_expires_at, refresh_token, refresh_expires_at, user }`
- User object: `{ id, username, display_name, avatar_url, profile_url }`

**POST /auth/refresh**
- Body: `refresh_token`, `device_id`, optional `remember`, `set_cookie`
- Response: Same shape as `/auth/login`

**GET /auth/me**
- Requires authenticated request (Bearer token)
- Response: `{ id, username, email, display_name, avatar_url, profile_url, registered, onboarding_completed }`
- Note: `profile_url` may be empty string if `ec_get_user_profile_url()` unavailable

**POST /auth/logout**
- Requires authenticated request
- Body: `device_id`
- Response: `{ success: boolean, message: string }`

#### Activity Feed Endpoint

**GET /activity**
- Requires authenticated request
- Query params: `cursor` (int), `limit` (int, max 100), `blog_id` (int), `actor_id` (int), `visibility` (`public` default, `private` requires admin), `types[]`
- Response: `{ items: ActivityItem[], next_cursor: number | null }`

**Activity Types**: `post_published`, `post_updated`, `comment_created`

**Post Types** (in `item.data.post_type`): Core (`post`, `page`), CPTs (`artist_profile`, `artist_link_page`, `newsletter`, `ec_doc`, `festival_wire`, `wook_horoscope`, `ec_chat`)

### Additional Available API Categories

The API plugin exposes additional endpoints (not currently consumed by this app):
- `artists/*`, `users/*`, `community/*`, `chat/*`, `shop/*`, `newsletter/*`, `media/*`, `analytics/*`, `tools/*`, `events/*`, `stream/*`, `contact/*`, `docs/*`, `admin/*`
