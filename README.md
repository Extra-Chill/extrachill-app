# Extra Chill Mobile App

React Native mobile app for the Extra Chill music community platform.

## Requirements

- Node.js 18+
- Xcode (for iOS development)
- Android Studio (for Android development)
- Expo CLI

## Setup

```bash
npm install
```

## Development

```bash
# Start Expo dev server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android
```

## Project Structure

```
extrachill-app/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout with AuthProvider
│   ├── index.tsx           # Auth state redirect
│   ├── login.tsx           # Login form
│   └── feed.tsx            # Activity feed (placeholder)
├── src/
│   ├── api/
│   │   └── client.ts       # API client
│   ├── auth/
│   │   ├── context.tsx     # Auth context + useAuth hook
│   │   └── storage.ts      # SecureStore helpers
│   └── types/
│       └── api.ts          # TypeScript interfaces
├── assets/                 # App icons and splash screen
├── docs/
│   └── CHANGELOG.md        # Version history
└── plan.md                 # Implementation roadmap
```

## API

The app connects to the Extra Chill WordPress REST API at `https://extrachill.com/wp-json/extrachill/v1`.

### Auth Endpoints

- `POST /auth/login` - Authenticate with username/email + password
- `POST /auth/refresh` - Rotate access token using refresh token
- `GET /auth/me` - Get current user (requires bearer token)
- `POST /auth/logout` - Revoke device session

## License

Private - Extra Chill
