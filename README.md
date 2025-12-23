# Extra Chill Mobile App

React Native mobile application for the Extra Chill music community platform with Expo Router navigation and JWT authentication.

## Requirements

- Node.js 18+
- Xcode 15+ (for iOS development)
- Android Studio (for Android development)
- Expo CLI (EAS Build for production)

## Setup

```bash
npm install
npm start
```

## Development

```bash
# Start Expo dev server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android

# Type checking (strict)
npx tsc -p tsconfig.json --noEmit
```

## Project Structure

```
extrachill-app/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx         # Root layout with AuthProvider
│   ├── index.tsx           # Auth state redirect
│   ├── login.tsx           # Login form
│   └── feed.tsx            # Activity feed
├── src/
│   ├── api/
│   │   └── client.ts       # API client configuration
│   ├── auth/
│   │   ├── context.tsx     # Auth context + useAuth hook
│   │   └── storage.ts      # SecureStore token management
│   └── types/
│       └── api.ts          # TypeScript type definitions
├── assets/                 # App icons and splash screen
└── docs/
    └── CHANGELOG.md        # Version history
```

## API Integration

The mobile app consumes the [ExtraChill REST API](../extrachill-plugins/extrachill-api/) at `https://extrachill.com/wp-json/extrachill/v1`.

### Auth Endpoints

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `POST /auth/login` | Authenticate with username/email + password | No |
| `POST /auth/refresh` | Rotate access token using refresh token | No |
| `GET /auth/me` | Get current authenticated user | Yes |
| `POST /auth/logout` | Revoke device session | Yes |

### Activity Feed Endpoint

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `GET /activity` | Paginated activity feed with filtering | Yes |

### Authentication Flow

1. **Login**: User credentials → `/auth/login` → returns JWT tokens
2. **Session Management**: Store tokens in SecureStore
3. **Token Refresh**: Call `/auth/refresh` when access token expires
4. **Logout**: Call `/auth/logout` to revoke device session

### Device Tracking

All auth endpoints require a `device_id` parameter (UUID v4) for multi-device session management.

## Documentation

- **[AGENTS.md](AGENTS.md)** - Development guidelines and API usage details
- **[extrachill-api Plugin](../extrachill-plugins/extrachill-api/)** - Complete REST API documentation

## License

Private - Extra Chill
