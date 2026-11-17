# In-app two-step sign-in (#120)

Layer 4 of the in-app two-factor contract: members turn on, use, and manage two-step sign-in entirely inside the app. No wp-login, wp-admin, or Two Factor-rendered screen is opened.

## Sign-in step

Password (`wp-native/auth-login` via the shell), Google (`extrachill/v1/auth/google`) and Apple (`extrachill/v1/auth/apple`) can all return:

```json
{ "challenge_required": true, "challenge_policy": "two-factor",
  "challenge": { "type": "two_factor", "provider": "…", "providers": [{ "key": "…", "label": "…" }] },
  "continuation_token": "…", "continuation_expires_at": "…" }
```

`app/login.tsx` swaps the form for `TwoStepSignIn` (`src/two-factor/SignInStep.tsx`): method switcher (authenticator app / email code with "Email me a new code" / backup code), numeric input with one-time-code autofill, and Verify. Other challenge types show a "can't do yet" message instead of signing in.

All continuation goes through `continueTwoFactorSignIn(transport, token, response)` in `src/two-factor/client.ts`. The default `createShellSignInTransport`:

| Action | Call | Why |
| --- | --- | --- |
| Verify `{ provider, code }` | shell `continueLogin` → `wp-native/auth-continue-login` | the shell stores tokens and flips to signed in |
| Resend `{ provider, resend: true }` | raw `POST wp-abilities/v1/abilities/wp-native/auth-continue-login/run` (or `extrachill/v1/auth/login/continue` with `route: 'rest'`) | no session is created; keeps WordPress error `data` |

Continuations are bound to device and client, so Google/Apple sign-in now sends the shell's device id (`getShellDeviceId()`) and the `WP-Native-Client` header.

Outcomes (`signInReducer` in `src/two-factor/model.js`): wrong code (401) stays on the step, clears the code, and adopts a rotated `data.continuation_token` if sent; 429 counts down from `data.retry_after`; 403 password reset required explains the emailed reset link and returns to sign-in; expired/invalid/exhausted continuation returns to sign-in with "Your sign-in timed out".

## Settings → Security

`SecuritySettings` (in You → Account settings) uses the Two Factor REST routes through the shell client's public authenticated `client.request()` (bearer, refresh, 401 retry; errors keep WordPress `data`):

| UI | Route |
| --- | --- |
| Status / feature detect | `GET two-factor/1.0/users/<id>/providers` (404 hides the section) |
| Turn on/off, "Use this first" | `POST two-factor/1.0/users/<id>/providers` `{ enabled_providers, primary_provider }` |
| Authenticator setup | `POST two-factor/1.0/totp/enrollment` → selectable key, "Open in authenticator app" (`otpauth://`), copy/share → `POST two-factor/1.0/totp` `{ user_id, code, enable_provider: true }` |
| Backup codes | `POST two-factor/1.0/generate-backup-codes` `{ user_id, enable_provider: true }` → show, copy/share |
| Confirm it's you | `POST two-factor/1.0/revalidate` (`{}` → methods, `{ provider, resend: true }`, `{ provider, code }`) |

Any change that fails with `revalidation_required` opens the Confirm it's you sheet and retries the original change once (`runWithRevalidation`). Turning off the last real method also turns off backup codes, so they never stand alone. No QR code is drawn: the member is on the phone that runs the authenticator, so the deep link and the copyable key replace scanning (and avoid a QR dependency).

## Client versions

WordPress error `data` (`retry_after`, rotated `continuation_token`, `revalidation`) and `client.request()` come from wp-native-client (Extra-Chill/wp-native#122 / #123). The app feature-detects both, so it also runs on the installed `wp-native-client@0.1.0`:

- `shellRestRequester` uses `client.request()` when it exists, and otherwise falls back to the client's TypeScript-private `transport`.
- On the verify path (shell `continueLogin`), the installed client drops error `data`. A 429 then counts down a fixed `DEFAULT_RETRY_SECONDS` (30), and a rotated continuation can't be adopted. Newer clients pass `data` through. The raw resend path always keeps `data`.

Both fallbacks stop being used once `package.json` takes a wp-native-client release that includes #123. Caret ranges on 0.x don't cross minors, so the range has to be raised by hand.

## Dependencies (not live yet)

- WordPress/two-factor#935 (provider management, TOTP enrollment) and #1045 (non-rendering verification, revalidate route) plus the bearer-session filter from the contract.
- Extra-Chill/wp-native#120: re-challenge on verify without burning the continuation; the shell's `continueLogin` must return (not store) a re-issued challenge.
- Extra-Chill/extrachill#1641: `two-factor` challenge policy for password, Google and Apple, and `extrachill/v1/auth/login/continue`.

## Validation

- `npm test` (`src/two-factor/model.test.js`, `src/two-factor/client.test.js`)
- `npm run typecheck`
