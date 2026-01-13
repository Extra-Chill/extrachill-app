# Agent Instructions (extrachill-app)

## Commands
- Dev: `npm start` (Expo)
- Run: `npm run ios` / `npm run android` / `npm run web`
- Typecheck: `npx tsc -p tsconfig.json --noEmit` (strict)
- Lint/format/tests: not configured (no ESLint/Prettier/Jest/Vitest)

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

**Authentication**: Access tokens via `Authorization: Bearer <access_token>` header.

**Device Tracking**: Auth/session endpoints require `device_id` as UUID v4.

### Endpoints used by the app

#### Authentication Endpoints

**POST /auth/login**
- Body: `identifier`, `password`, `device_id`
- Response: `LoginResponse`

**POST /auth/register**
- Body: `email`, `password`, `password_confirm`, `device_id`, `registration_source`, `registration_method`
- Response: `RegisterResponse`

**POST /auth/refresh**
- Body: `refresh_token`, `device_id`
- Response: `RefreshResponse`

**GET /auth/browser-handoff**
- Requires authenticated request (Bearer token)
- Returns: Handoff token for web session establishment

**GET /auth/me**
- Requires authenticated request (Bearer token)
- Response: `AuthMeResponse` (see `src/types/api.ts`)
- Note: `profile_url` is optional

**POST /auth/logout**
- Requires authenticated request
- Body: `device_id`

#### Activity feed

**GET /activity**
- Requires authenticated request
- App uses: `cursor`, `limit`
- Response: `{ items: ActivityItem[], next_cursor: number | null }`

`ActivityItem` and related types are defined in `src/types/api.ts`.
