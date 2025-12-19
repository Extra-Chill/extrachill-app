# Changelog

All notable changes to the Extra Chill mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
