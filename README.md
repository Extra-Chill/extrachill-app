# Extra Chill App

React Native application for operating the Extra Chill platform through Roadie.

Roadie is the default interface. The app authenticates an Extra Chill user, connects to canonical WordPress and Agents API contracts, and presents conversations, tool results, work progress, and approvals natively. Domain capabilities and authorization remain server-owned.

See [plan.md](plan.md) for the product charter, architecture, milestones, and beta acceptance criteria.

## Current Status

The repository contains the authenticated Expo application foundation:

- Login, registration, Google authentication, and onboarding.
- Secure bearer-token storage and automatic refresh through `wp-native`.
- WordPress Abilities API discovery and execution.
- Authenticated browser handoff for Extra Chill network URLs.
- Expo Router, Extra Chill design tokens, and native fonts.

The current post-login screen is a placeholder. Native Roadie chat, sessions, run progress, structured tool results, pending-action resolution, Work, and Inbox are planned next.

## Commands

- Start development server: `npm start`
- Run iOS: `npm run ios`
- Run Android: `npm run android`
- Run web development target: `npm run web`
- Type check: `npm run typecheck`

## Architecture

```text
React Native app
  -> wp-native bearer transport
  -> canonical Agents API REST / ability contracts
  -> Roadie
  -> domain-owned Extra Chill abilities
```

The application should not hardcode Roadie's tool inventory, duplicate role policy, or introduce app-specific backend substitutes for existing abilities.

## Project Structure

```text
app/                       Expo Router routes
src/auth/                  Extra Chill auth and storage integration
src/components/            Native UI components
src/types/                 Consumer-owned API types
assets/                    App icons, images, and fonts
extrachill.config.ts        wp-native-shell consumer configuration
plan.md                    Product charter and delivery milestones
```

## Production API

The app uses `https://extrachill.com/wp-json` as its production WordPress REST root. Authentication is provided by `wp-native-auth`; product and agent operations are exposed through discoverable abilities.

## License

Private - Extra Chill
