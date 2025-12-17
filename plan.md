# extrachill-app — Implementation Plan

**CURRENT STATUS**: Phase 6 complete. Expo + TypeScript app bootstrapped with working auth flow. Login tested successfully against production API. Bearer auth (`GET /auth/me`) and logout (`POST /auth/logout`) implemented and functional. Ready for feed implementation (Phase 3 emitters still pending for richer content).

## Vision
Build a React Native mobile app for the entire Extra Chill multisite network.

- **Core surface**: a chronological, network-wide activity feed (Twitter-like).
- **Content scope**: everything becomes an activity item (posts, comments, forum activity, artist updates, shop events, etc.).
- **Admin scope**: no `wp-admin` inside the app. Publishing blog posts is not an app concern.
- **Social model**: no follower-count-driven mechanics. Keep “following” open-ended; default is global chronological + modern filtering.

## Non-Negotiables
- **API-first**: the app cannot exist without the API.
- **Backend is the single source of truth**: the API emits canonical event payloads; the app is a client.
- **Everything is in the feed**: no premature curation rules. Filtering/tuning is a later UI concern.
- **Single API base URL**: the app calls one host in production (`extrachill.com`).
- **Authenticated-only app**: users must have an account; no logged-out browsing.
- **No Blog 1 membership for normal users**: do not add community accounts to Blog ID 1. Blog ID 1 is for EC team members only.
- **Local build first**: run from simulator against the live WordPress site.

## Backend Architecture (WordPress)
The mobile app depends on two network-activated plugins:
- `extrachill-plugins/extrachill-api` (REST route discovery + platform endpoints)
- `extrachill-plugins/extrachill-users` (single source of truth for authentication + user management)

This plan extends the platform API surface, but authentication work must happen in `extrachill-users` to avoid divergent auth paths.

### API Gateway Rule (host-agnostic)
All `extrachill/v1` endpoints must behave identically regardless of which `.extrachill.com` site receives the request.

- Route handlers must not depend on implicit current-site context for cross-network data.
- Site-specific reads/writes must explicitly route using:
  - `ec_get_blog_id( '<site>' )` when the destination site is canonical (artist/shop/events/etc.)
  - `switch_to_blog( $blog_id )` / `restore_current_blog()` using `try/finally` discipline

The app still calls one host; this rule keeps the backend stable and relocatable.

## Unified Activity System (implemented)
A network-wide activity event stream stored in a single network table.

- **Storage**: custom network table via `$wpdb->base_prefix`:
  - `{$wpdb->base_prefix}extrachill_activity`
- **Emitter contract**: one canonical action contract:
  - `do_action( 'extrachill_activity_emit', $event );`
- **Validation**: events are normalized/validated server-side before insert.

### Activity event shape (current)
This is the shape returned by the feed endpoint today.

- `id` (int)
- `created_at` (UTC ISO8601)
- `type` (string; currently: `post_published`, `post_updated`, `comment_created`)
- `blog_id` (int)
- `actor_id` (nullable int)
- `summary` (server-generated human sentence)
- `visibility` (`public` or `private`)
- `primary_object` (required)
  - `object_type` (string; currently: `post` or `comment`)
  - `blog_id` (int)
  - `id` (string)
- `secondary_object` (optional; same shape)
- `data` (nullable JSON object; small “feed card” payload)

### Core emitters (implemented)
Core WordPress emitters are live in `extrachill-api`:

- Posts (all post types; skips revisions/autosaves/attachments): emit on `transition_post_status` when status becomes `publish`
  - Types: `post_published`, `post_updated`
  - Card data: `{ title, excerpt, permalink }`
- Comments: emit via `comment_post` when approved
  - Type: `comment_created`
  - Card data: `{ title (post title), permalink (post link) }`

### Visibility (current status)
`visibility` exists as a first-class column/arg for future privacy + admin surfaces.

- **Decision**: v1 global feed is **public-only**.
- **Current code behavior**: `/activity` defaults to `public` and core emitters write `public` events.
- **Admin-only carveout**: requesting `visibility=private` is restricted to admins.

## Core REST Endpoints (implemented)
Foundational endpoints under the existing namespace.

### `GET /wp-json/extrachill/v1/activity`
- Cursor pagination (`cursor` = last event id)
- `limit`
- Optional filters (supported now, UI later): `types[]`, `blog_id`, `actor_id`
- Supports `visibility` (`public` or `private`, admin-only)

### `GET /wp-json/extrachill/v1/object`
Purpose: hydrate a feed reference into a detail payload.

- Params: `object_type`, `blog_id`, `id`
- Behavior: internally routes to the correct blog (via `switch_to_blog`) and returns a normalized payload.
- Resolvers implemented:
  - `post` (public if `publish`, otherwise requires `edit_post`)
  - `comment` (public if approved, otherwise requires author or `edit_comment`)
  - `artist` (currently management-only; requires `ec_can_manage_artist`)

## Auth (token-first, via `extrachill-users`)
Authentication is owned by `extrachill-plugins/extrachill-users` (single source of truth). The mobile app uses password-based login and bearer tokens (no Application Passwords).

Core constraints:
- The app authenticates with **username/email + password**.
- The app uses the production host **`https://extrachill.com`** as the single API base URL.
- The website calls auth endpoints **same-origin** so WordPress cookies can be set reliably.
- Normal users remain community-site members only (do **not** add them to Blog ID 1).

### Token model
- **Access token**: short-lived bearer token (`Authorization: Bearer <token>`), TTL = **15 minutes**.
- **Refresh token**: long-lived token with **sliding TTL = 30 days** (each successful refresh extends expiry another 30 days).
- **Per-device sessions**: each device gets its own refresh token, revokable per device.
- **Refresh rotation**: every `/auth/refresh` call issues a new refresh token and invalidates the prior refresh token immediately.
- **Device identity**: `device_id` is required and must be a UUID v4 (no fallback).

### Endpoints (implemented + planned)
All routes are under `extrachill/v1` and must work regardless of which multisite host receives the request.

**Unified contract**
- All auth endpoints always return tokens (even when the web UI is using cookies).
- Cookie-based browsing sessions are enabled by passing `set_cookie=true`.
- The website should call these endpoints **same-origin** (e.g. `fetch('/wp-json/...')`) so cookie storage is reliable.

- `POST /wp-json/extrachill/v1/auth/login` (implemented)
  - Body: `identifier` (username or email), `password`, `device_id` (UUID v4, required), optional `device_name`, optional `remember`, optional `set_cookie`
  - Behavior:
    - When `set_cookie=true`, sets WordPress auth cookies for a normal browsing session
    - Always returns tokens for API use
  - Returns: `access_token`, `access_expires_at`, `refresh_token`, `refresh_expires_at`, `user`
- `POST /wp-json/extrachill/v1/auth/register`
  - Body: `username`, `email`, `password`, `password_confirm`, `cf-turnstile-response`, optional `user_is_artist`, optional `user_is_professional`, `device_id` (UUID v4, required), optional `device_name`, optional `set_cookie`
  - Behavior:
    - Creates the user on community.extrachill.com (Blog ID 2)
    - When `set_cookie=true`, sets WordPress auth cookies for a normal browsing session
    - Always returns tokens for API use
  - Returns: `access_token`, `access_expires_at`, `refresh_token`, `refresh_expires_at`, `user`
- `POST /wp-json/extrachill/v1/auth/refresh` (implemented)
  - Body: `refresh_token`, `device_id` (UUID v4, required)
  - Behavior: rotates refresh token and extends refresh expiry (sliding 30 days)
  - Returns: new `access_token` + new `refresh_token`
- `POST /wp-json/extrachill/v1/auth/logout` (implemented)
  - Body: `device_id` (UUID v4, required)
  - Behavior: revokes that device session
- `GET /wp-json/extrachill/v1/auth/me` (implemented)
  - Requires bearer token
  - Returns: current user payload used by the app

### Password reset (v1)
Password reset remains **web-only** for now.
- App links out to `https://community.extrachill.com/reset-password/`

## Mobile App Architecture (Expo + React Native)

**Stack**: Expo SDK 54, TypeScript, Expo Router (file-based navigation), SecureStore for token persistence.

**Current screens**:
- Login (`app/login.tsx`) - Username/email + password form
- Feed (`app/feed.tsx`) - Placeholder showing "Welcome, {user}" after successful auth

**Directory structure**:
```
extrachill-app/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout with AuthProvider
│   ├── index.tsx           # Redirect based on auth state
│   ├── login.tsx           # Login form
│   └── feed.tsx            # Placeholder feed
├── src/
│   ├── api/client.ts       # API client (login, refresh, me, logout)
│   ├── auth/
│   │   ├── context.tsx     # AuthContext + useAuth hook
│   │   └── storage.ts      # SecureStore helpers
│   └── types/api.ts        # TypeScript interfaces
```

**Planned screens**:
- Home: Activity feed (infinite scroll via `GET /activity`)
- Detail: Native detail screens hydrated via `GET /object`

**Caching**:
- Cache hydrated objects client-side (keyed by `object_type:blog_id:id`).

## Milestones

### Phase 0 — Contract (in progress)
- Keep event schema minimal and stable.
- Expand `type` taxonomy later without breaking existing clients.

### Phase 1 — Activity Infrastructure (completed)
- Network table install + query helpers.
- Emitter action listener + event validation.
- `GET /activity` route.
- `GET /object` route + initial resolvers.

### Phase 1.1 — Public feed alignment (completed)
- Default `/activity` to `public`.
- Emit core post/comment events with `visibility=public`.
- Restrict `visibility=private` feed access to admins.

### Phase 2 — Token auth + web dogfooding (completed)
Token endpoints implemented in `extrachill-plugins/extrachill-users`.

Implemented:
- `POST /auth/login` - Web dogfooding via Gutenberg login block with `set_cookie=true`
- `POST /auth/refresh` - Rotation + sliding expiry
- `GET /auth/me` - Bearer token validation, returns user payload
- `POST /auth/logout` - Revokes device session

Pending:
- `POST /auth/register` - Needs Turnstile handling for mobile

Notes:
- Web uses `set_cookie=true` to establish a normal WordPress browsing session.
- Web and mobile both receive the same token payloads (unified contract).

### Phase 3 — Emitters: “Everything” (pending)
Instrument event emission from:
- Core WP: users, media
- Community/bbPress: topics, replies
- Artist platform: profile + links + socials + roster actions
- Woo/shop: products, orders, refunds

### Phase 4 — Write Actions (app-driven creation) (pending)
Ensure the API supports app-driven creation flows across the ecosystem:
- Create/edit forum topics/replies
- Create/edit comments
- Update artist profiles/links/socials

### Phase 5 — Notifications (plumbing) (pending)
- Device registration endpoint(s) (store push token per user/device).
- Notification rules can be added later; the activity stream remains the source.

### Phase 6 — Bootstrap the RN App (completed)
- Initialized Expo + TypeScript project with expo-router
- Connected to production API (`https://extrachill.com`)
- Implemented Auth flow (login → feed)
- Login tested successfully against production
- Ready for feed implementation

## Acceptance Criteria (dev)
- `POST /wp-json/extrachill/v1/auth/login` returns tokens for valid credentials with `device_id` (UUID v4 required).
- `POST /wp-json/extrachill/v1/auth/login` with `set_cookie=true` creates a normal WP browsing session.
- `POST /wp-json/extrachill/v1/auth/refresh` rotates refresh token and extends refresh expiry (sliding 30 days).
- `POST /wp-json/extrachill/v1/auth/register` returns tokens and creates users on community (Blog ID 2) with `device_id` (UUID v4 required).
- `POST /wp-json/extrachill/v1/auth/register` with `set_cookie=true` creates a normal WP browsing session.
- `GET /wp-json/extrachill/v1/me` works with bearer auth.
- `GET /wp-json/extrachill/v1/activity` returns real network-wide events (public feed).
- Publishing content creates new feed items.
- Local RN build can authenticate, display the feed, and open native detail screens via `GET /object`.

## Open Decisions (intentionally deferred)
- Private visibility rules beyond “admin-only”.
- Follow graph vs no-follow (leaning no-follow + filters; keep open).
- Tooling specifics for RN (Expo vs bare) and shared package strategy (defer until API is proven).
- “Discussion under feed items” model (defer until feed usage reveals needs).
