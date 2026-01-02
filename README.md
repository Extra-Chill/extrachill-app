# Extra Chill Mobile App

React Native mobile application for the Extra Chill music community platform with Expo Router navigation and token-based authentication.

## Commands

- Dev server: `npm start`
- Run: `npm run ios` / `npm run android` / `npm run web`
- Type check: `npx tsc -p tsconfig.json --noEmit`

## Project Structure

```
extrachill-app/
├── app/                       # Expo Router routes
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── onboarding.tsx
│   └── (drawer)/
│       ├── _layout.tsx
│       └── feed.tsx
├── src/
│   ├── api/client.ts          # API client + token refresh
│   ├── auth/                  # Auth context + SecureStore
│   ├── components/            # UI components (ActivityCard, DrawerContent, etc.)
│   ├── theme/                 # Theme tokens + context
│   ├── utils/
│   └── types/api.ts           # API response types
├── assets/
└── docs/CHANGELOG.md
```

## API Integration

The app calls the Extra Chill REST API at `https://extrachill.com/wp-json/extrachill/v1` (see `src/api/client.ts`).

### Auth endpoints used

- `POST /auth/login` (requires `device_id`)
- `POST /auth/register` (requires `device_id`; includes `registration_source`/`registration_method`)
- `POST /auth/refresh` (requires `device_id`)
- `POST /auth/logout` (requires `device_id`)
- `GET /auth/me`
- `POST /auth/google` (requires `device_id`)
- `GET /config/oauth`
- `GET`/`POST /users/onboarding`
- `POST /auth/browser-handoff` (creates one-time web session handoff URLs)

### Activity feed

- `GET /activity` (cursor pagination; app uses `cursor` + `limit`)

### Device tracking

`device_id` is a UUID v4 persisted client-side and sent on auth/session endpoints.


## Documentation

- **[AGENTS.md](AGENTS.md)** - Development guidelines and API usage details
- **[extrachill-api](../extrachill-plugins/extrachill-api/)** - REST API implementation (server-side)

## License

Private - Extra Chill
