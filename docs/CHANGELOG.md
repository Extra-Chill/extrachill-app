# Changelog

All notable changes to the Extra Chill mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-12-22

### Added

- Browser session handoff for seamless transitions between mobile app and web interface
  - New `/auth/browser-handoff` endpoint integration for authenticated one-time URLs
  - Automatic handoff for extrachill.com links when user is authenticated
  - Graceful fallback to direct link opening on errors
- Taxonomy badges display in activity feed cards
  - Priority-based ordering (location, festival, venue, category, tags, artist, promoter)
  - Custom badge colors from API (background and text)
  - Display alongside post type badges
- User capability-based drawer navigation
  - Conditional menu items based on user permissions
  - Artist profile management (create, single, or multiple artists)
  - Link page management (create, single, or multiple pages)
  - Shop management (create or manage products)
  - Settings link to community site
- Extended user data model in `/auth/me` endpoint
  - `artist_ids`: Array of managed artist profile IDs
  - `latest_artist_id`: Most recently managed artist ID
  - `link_page_count`: Number of link pages owned by user
  - `can_manage_shop`: Shop management permission flag
  - `shop_product_count`: Number of shop products owned
  - `can_create_artists`: Artist profile creation permission flag
  - `site_urls`: Object with site URLs (community, artist, shop)
- Registration metadata tracking
  - `registration_source`: App identifier (e.g., 'extrachill-app')
  - `registration_method`: Auth method (e.g., 'standard', 'google')
  - Applied to both standard registration and Google OAuth flows
- New API response types: `BrowserHandoffResponse`, `ActivityTaxonomyTerm`
- Enhanced `AuthMeResponse` interface with extended user capability flags
- Extended `ActivityItemData` with `taxonomies` field for badge rendering

### Changed

- Auth context now calls `api.getMe()` explicitly after login, registration, and Google sign-in
  - Ensures complete user data (including capabilities) is loaded immediately
  - Replaced direct use of user data from login/register responses
- Drawer content refactored from dynamic API-driven menu to static capability-based navigation
  - Removed dependency on `/users/me/avatar-menu` endpoint
  - Removed `AvatarMenuItem` and `AvatarMenuResponse` types
  - Simplified component by removing state management and effects
- API client `register()` method now includes registration metadata
- Activity card event metadata formatting now applies to all post types (previously only events)
- Documentation reorganization across AGENTS.md, README.md, and plan.md
  - Improved API integration documentation
  - Updated implementation status to reflect completed features
  - Enhanced project structure descriptions

### Removed

- `AvatarMenuItem` and `AvatarMenuResponse` type definitions
- `getAvatarMenu()` API client method
- Dynamic menu fetching and state management from DrawerContent component
- Outdated endpoint reference in CHANGELOG (`/users/me/avatar-menu`)

## [0.3.0] - 2025-12-20

### Added

- User registration flow with email and password validation
  - New `/auth/register` endpoint integration
  - Password confirmation validation (minimum 8 characters)
  - Email format validation
- OAuth2 Google Sign-In support with lazy-loaded native module
  - New `/auth/google` endpoint for OAuth token exchange
  - New `/config/oauth` endpoint for OAuth configuration retrieval
  - Graceful fallback when native module unavailable (Expo Go)
  - Support for iOS and web client IDs
- Post-registration onboarding screen (`app/onboarding.tsx`)
  - Username selection with validation (3-60 characters, alphanumeric + hyphens/underscores)
  - User preference flags (musician/professional options)
  - Onboarding status persistence via `/users/onboarding` endpoint
- New API endpoints:
  - `/auth/register` - User registration with device tracking
  - `/auth/google` - OAuth token exchange and auto-login
  - `/config/oauth` - OAuth provider configuration
  - `/users/onboarding` - Get and submit onboarding status
  - `/auth/me` extended user navigation context (artist IDs, link page count, site URLs)
- `GoogleSignInButton` component for consistent OAuth UI
- `Checkbox` component with disabled state support
- New API response types: `RegisterResponse`, `GoogleLoginResponse`, `OnboardingStatusResponse`, `OnboardingSubmitResponse`, `OAuthConfigResponse`

### Changed

- Login screen refactored as unified auth screen supporting both login and registration modes
  - Mode toggle between "Sign In" and "Create Account"
  - Conditional form fields (password confirm only in registration mode)
  - Dynamic button labels based on active mode
  - Improved visual feedback with divider between email/password and OAuth options
- Auth context expanded with new state fields: `onboardingCompleted`, `googleEnabled`
- Auth context expanded with new methods: `register()`, `loginWithGoogle()`, `completeOnboarding()`
- Login/registration redirects now check onboarding status and route to `/onboarding` if not completed
- Index route logic updated to route authenticated users to `/onboarding` if onboarding incomplete
- API client enhanced with centralized OAuth configuration management and device ID integration for registration/OAuth flows
- API types expanded with comprehensive metadata support for activity items (event data, reply data)

### Removed

- N/A

## [0.2.0] - 2025-12-19

### Added

- Drawer navigation system using `@react-navigation/drawer` with gesture handling and animations
- Custom font loading for 'Helvetica' and 'LoftSans' fonts to prevent flicker on app load
- Logo display in login screen (90x90 image centered above form)
- Session expired notice in login form with auto-clear on component unmount
- Automatic token refresh in API client with 5-minute expiry buffer and concurrency lock
- New drawer-based feed layout (`app/(drawer)/feed.tsx`) replacing standalone feed screen
- ActivityCard component for displaying activity items in feed
- Avatar component for user profile images
- DrawerContent component for navigation drawer UI
- Time utilities in `src/utils/time.ts` for date formatting
- Babel configuration (`babel.config.js`) for Expo preset
- iOS project files (Xcode configuration, plist, entitlements, storyboard)

### Changed

- API client (`src/api/client.ts`) refactored with centralized auth token management, automatic refresh logic, and device ID integration
- Login screen (`app/login.tsx`) updated with logo, session expired error display, and font family styling
- Auth context (`src/auth/context.tsx`) added sessionExpired state and clearSessionExpired method
- Auth storage (`src/auth/storage.ts`) enhanced with StoredTokens type and expiry timestamp handling
- Theme context (`src/theme/context.tsx`) added fontFamily support
- Root layout (`app/_layout.tsx`) added font loading with conditional render to wait for fonts
- Index screen (`app/index.tsx`) updated redirect from `/feed` to `/(drawer)/feed`
- Package scripts updated: "android" and "ios" now use `expo run:`, added "typecheck" script
- Dependencies updated for Expo/React Native compatibility (e.g., React versions aligned)

### Removed

- Obsolete standalone feed screen (`app/feed.tsx`) replaced by drawer version
- References to multisite and membership features in `plan.md`
- Ignored files (`CLAUDE.md`, `AGENTS.md`) from `.gitignore`
- Mobile App Architecture section from `plan.md` (replaced with API-focused notes)

## [0.1.0] - 2025-12-17

### Added

- Initial Expo + TypeScript project setup with Expo SDK 54
- File-based routing with expo-router
- Authentication flow against production Extra Chill API
  - Login screen with username/email and password
  - Secure token storage via expo-secure-store
  - Bearer token authentication for API requests
  - Logout functionality with device session revocation
- Auth context provider with `useAuth()` hook
- API client with typed endpoints (`/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`)
- Device ID persistence (UUID v4) for per-device session management
- Placeholder feed screen showing authenticated user info
