# Extra Chill App

React Native application for the Extra Chill Online Music Scene.

Extra Chill is the product and its human scene is the heart. `wp-native` provides consistent cross-platform authentication, discovery, transport, and shell behavior. Roadie is the universal conversational interface across Scene, Calendar, community, and capability-driven artist, venue, editorial, and team workspaces.

Structured native surfaces, Roadie tools, and web interfaces converge on the same domain-owned WordPress abilities so authorization and behavior remain consistent everywhere.

See [plan.md](plan.md) for the product charter, architecture, milestones, and beta acceptance criteria.

## Current Status

The repository contains the authenticated Expo application foundation:

- Login, registration, Google authentication, and onboarding.
- Secure bearer-token storage and automatic refresh through `wp-native`.
- WordPress Abilities API discovery and execution.
- Authenticated browser handoff for Extra Chill network URLs.
- Expo Router, Extra Chill design tokens, and native fonts.

The current post-login screen is a placeholder. Native Scene, Calendar, Roadie, Inbox, and capability-driven workspace surfaces are planned next.

## Commands

- Start development server: `npm start`
- Run iOS: `npm run ios`
- Run Android: `npm run android`
- Run web development target: `npm run web`
- Type check: `npm run typecheck`

GutenbergKit native builds require iOS 17+ and an Xcode 26 toolchain capable of
resolving Swift tools 6.2 packages. The editor is unavailable in Expo Go; use a
custom development or production build.

## Architecture

```text
Structured native surface ─┐
Roadie tool ────────────────┼─> domain-owned WordPress ability
Web interface ──────────────┘

React Native application
  -> wp-native auth, discovery, transport, and shell behavior
  -> WordPress Abilities API and canonical Agents API contracts
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
