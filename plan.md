# extrachill-app — Implementation Plan

**CURRENT STATUS**: Token auth is implemented in `extrachill-plugins/extrachill-users`. The React Native app (v0.4.0) implements authentication (email/password + Google), onboarding, browser session handoff for `.extrachill.com` links, capability-based drawer navigation, and Browser Handoff (/auth/browser-handoff). Home screen is a placeholder pending section-based navigation.

## Vision
Build a React Native mobile app as a personalized representation of the Extra Chill multisite network.

- **Core surface**: section-based navigation — events calendar, community forums, blog, artist profiles, shop — each section presents its own native view backed by the corresponding WordPress REST API.
- **Authoring vision**: Native Gutenberg Integration inside the app as a primary authoring tool (replacing the web-handoff-only model).
- **Admin scope**: no `wp-admin` inside the app. Publishing blog posts is not an app concern.
- **Social model**: no follower-count-driven mechanics. Keep "following" open-ended; personalization is a later UI concern.

## Non-Negotiables
- **API-first**: app cannot exist without API.
- **Backend is single source of truth**: WordPress REST API is the data source; app is a client.
- **Single API base URL**: app calls one host in production (`extrachill.com`).
- **Authenticated-only app**: users must have an account; no logged-out browsing.
- **No Blog 1 membership for normal users**: do not add community accounts to Blog ID 1.
- **No activity feed**: the unified activity table has been deprecated. Each section queries its own data directly via WP REST API.

## Backend Architecture (WordPress)
The mobile app depends on two network-activated plugins:
- `extrachill-plugins/extrachill-api` (REST route discovery + platform endpoints)
- `extrachill-plugins/extrachill-users` (single source of truth for authentication + user management)

### API Gateway Rule (host-agnostic)
All `extrachill/v1` endpoints must behave identically regardless of which `.extrachill.com` site receives the request.

- Route handlers must not depend on implicit current-site context for cross-network data.
- Site-specific reads/writes must explicitly route using:
  - `ec_get_blog_id( '<site>' )` when destination site is canonical (artist/shop/events/etc.)
  - `switch_to_blog( $blog_id )` / `restore_current_blog()` using `try/finally` discipline

The app still calls one host; this rule keeps the backend stable and relocatable.

## Auth (token-first, via `extrachill-users`)
Authentication is owned by `extrachill-plugins/extrachill-users` (single source of truth). The mobile app uses password-based login and bearer tokens (no Application Passwords).

Core constraints:
- The app authenticates with **username/email + password**.
- The app uses production host **`https://extrachill.com`** as single API base URL.
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
- All auth endpoints always return tokens (even when web UI is using cookies).
- Cookie-based browsing sessions are enabled by passing `set_cookie=true`.
- The website should call these endpoints **same-origin** (e.g. `fetch('/wp-json/...')`) so cookie storage is reliable.

- `POST /wp-json/extrachill/v1/auth/login` (implemented)
  - Body: `identifier` (username or email), `password`, `device_id` (UUID v4, required), optional `device_name`, optional `remember`, optional `set_cookie`
  - Behavior:
    - When `set_cookie=true`, sets WordPress auth cookies for a normal browsing session
    - Always returns tokens for API use
  - Returns: `access_token`, `access_expires_at`, `refresh_token`, `refresh_expires_at`, `user`
- `POST /wp-json/extrachill/v1/auth/register` (implemented)
  - Body: `username`, `email`, `password`, `password_confirm`, `turnstile_response`, optional `user_is_artist`, optional `user_is_professional`, `device_id` (UUID v4, required), optional `device_name`, optional `set_cookie`
  - Behavior:
    - Creates user on community.extrachill.com (Blog ID 2)
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
  - Returns: current user payload used by app
- `POST /wp-json/extrachill/v1/auth/google` (implemented)
  - Body: `id_token`, `device_id` (UUID v4, required), optional `device_name`
  - Behavior: OAuth token exchange with automatic user creation
  - Returns: tokens + user data with onboarding_required flag if needed
- `GET /wp-json/extrachill/v1/config/oauth` (implemented)
  - Returns: OAuth provider configuration (client IDs)
- `GET/POST /wp-json/extrachill/v1/users/onboarding` (implemented)
  - GET: Returns onboarding completion status
  - POST: Completes onboarding with username selection

### Password reset (v1)
Password reset remains **web-only** for now.
- App links out to `https://community.extrachill.com/reset-password/`

## Mobile App Architecture (React Native)
React Native app (v0.4.0) currently implements:
- Authentication screens (login, registration, OAuth2)
- Onboarding flow (username selection, user preferences)
- Drawer navigation with capability-based menu items
- Browser handoff for `.extrachill.com` links
- Automatic token refresh
- Secure token storage via Expo SecureStore

Planned sections (each backed by existing WP REST endpoints):
- Events calendar
- Community forums
- Blog / articles
- Artist profiles
- Shop

## Milestones

### Phase 1 — Token Auth (completed)
Token endpoints implemented in `extrachill-plugins/extrachill-users` and dogfooded from existing Gutenberg login/register block.

Implemented:
- `POST /auth/login` with device tracking
- `POST /auth/register` with Cloudflare Turnstile
- `POST /auth/refresh` (rotation + sliding expiry)
- `POST /auth/logout` (device session revocation)
- `GET /auth/me` (current user data)
- `POST /auth/google` (OAuth2 authentication)
- `GET /config/oauth` (OAuth provider configuration)
- `GET/POST /users/onboarding` (onboarding flow)

### Phase 2 — Bootstrap RN App (completed)
- Initialize RN project (Expo SDK 54).
- Connect to production API base URL.
- Implement Auth + drawer navigation.
- Add browser handoff for `.extrachill.com` links.
- Add custom fonts and design tokens.

### Phase 3 — Section-Based Navigation (pending)
Build native views for each platform section, each querying WP REST directly:
- Events calendar
- Community forums
- Blog / articles
- Artist profiles

### Phase 4 — Write Actions (pending)
Ensure API supports app-driven creation flows across ecosystem:
- Create/edit forum topics/replies
- Create/edit comments
- Update artist profiles/links/socials

### Phase 5 — Notifications (pending)
- Device registration endpoint(s) (store push token per user/device).
- Notification rules engine.

## Acceptance Criteria
- `POST /wp-json/extrachill/v1/auth/login` returns tokens for valid credentials with `device_id` (UUID v4 required).
- `POST /wp-json/extrachill/v1/auth/login` with `set_cookie=true` creates a normal WP browsing session.
- `POST /wp-json/extrachill/v1/auth/refresh` rotates refresh token and extends refresh expiry (sliding 30 days).
- `POST /wp-json/extrachill/v1/auth/register` returns tokens and creates users on community (Blog ID 2) with `device_id` (UUID v4 required).
- `POST /wp-json/extrachill/v1/auth/register` with `set_cookie=true` creates a normal WP browsing session.
- `GET /wp-json/extrachill/v1/auth/me` works with bearer auth.
- `POST /wp-json/extrachill/v1/auth/google` supports OAuth2 flow with automatic user creation.
- Production RN build can authenticate and navigate section-based views.

## Open Decisions (intentionally deferred)
- Follow graph vs no-follow (leaning no-follow + filters; keep open).
- Tooling specifics for RN (Expo vs bare) and shared package strategy (defer until API is proven).
- Personalization strategy (user preferences, followed artists/locations, etc.).
