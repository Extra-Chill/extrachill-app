# Changelog

All notable changes to the Extra Chill mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
