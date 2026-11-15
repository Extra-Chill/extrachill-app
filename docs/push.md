# Native push

## Build and server setup

- SDK 54 uses `expo-notifications` and `expo-device`. Rebuild the native app after
  installing; Expo Go is not a push test environment. The notifications plugin
  configures the default Android channel. EAS iOS builds run prebuild as described
  in [app-store.md](app-store.md).
- Set `extra.eas.projectId` in `app.json` to the real EAS project UUID (`eas init`).
  Web, simulators, and the all-zero placeholder skip push setup and log once.
- Run `eas credentials` to configure the APNs push key for the correct Apple team
  and `com.extrachill.app`. Configure Android FCM v1 credentials in EAS as well.
  Never commit keys. Test development and production credentials separately.
- Server must expose `wp-native-auth/register-push-token` and
  `wp-native-auth/unregister-push-token`. Registration uses the authenticated
  shell client, `{ token, provider: "expo" }`, not a user/device ID supplied by us.
- Notification preferences use the existing get/update notification-preferences
  abilities. The push toggle is shown only when `push_enabled` is a boolean in
  the response and the update ability is advertised. Older servers keep email
  settings without a push toggle. This is user-level delivery preference, not an
  OS permission switch; if permission was denied, enable it in OS Settings.

## Behavior

The explanation appears only inside the authenticated app, never on the initial
logged-out launch. “Not now” persists dismissal on this installation. Only
“Continue” requests OS permission. Existing permission registers immediately after
login. Native token rotations fetch a new Expo token. Sign out serializes any
pending registrations, unregisters, then revokes the session; unregister errors
are logged but do not trap the user in the session.

Payload `data` is `{ notification_id, type, url }`. Cold and warm notification
responses use the same Inbox URL resolver; unambiguous topic/event/story IDs go
to native screens, other HTTP(S) URLs use browser handoff. Mark-read is best effort
when advertised. Foreground delivery suppresses the OS presentation and shows one
in-app banner with open/dismiss actions. No private body content is rendered.

## Verification

Run `npm run typecheck` and `npm test`. On physical iOS and Android builds:

1. Log in on a fresh install: skip the explanation; confirm no OS dialog appears.
2. Clear app data, log in, Continue, grant permission; inspect server registration.
3. Send Expo pushes with topic, event, story, and slug URLs. Tap from terminated
   and background states and tap the foreground banner. Check native routing,
   event canonical URL, browser fallback, and Inbox read state.
4. Send a foreground push: verify only one in-app notice and no OS banner/sound.
5. Sign out: check unregister runs before session revocation; log in again and
   confirm registration. Verify permission denial, offline failures, and rotation.
6. Check Settings against both old servers (no toggle) and push-enabled servers;
   toggle the preference and verify it persists and suppresses server delivery.

Physical-device delivery and APNs/FCM credentials cannot be validated by unit tests.
