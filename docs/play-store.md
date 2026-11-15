# Google Play release runbook

Android distribution preparation for #115 (parents #61, #52). No signed build or
submission has been performed. **[REPLACE …]** values are operator-owned blockers,
not working credentials. Do not change release versions as part of setup.

## 1. Organization enrollment

Create a Google Play Console **organization** developer account, not a personal
account. Obtain the organization's D-U-N-S number, legal name/address, authorized
contact and verification documents; allow time for verification. Pay the one-time
US $25 registration fee. Record **[REPLACE ORGANIZATION / ACCOUNT OWNER]** securely
and give release operators least-privilege access with two-factor authentication.

## 2. App record and Expo project

Create the Extra Chill app record, default language and app (not game) category.
Use package **`com.extrachill.app`**; this identity cannot be changed after upload.
Complete store listing, contact information, screenshots and privacy policy:
https://extrachill.com/privacy-policy/ . Support: https://extrachill.com/contact-us/ .

Replace `app.json`'s Expo owner and zero EAS project UUID with the real project
(`eas init` / `eas project:info`). Configure EAS development, preview and production
environments. Review the resolved public config before any build.

## 3. Play App Signing and Google authentication

Enroll in Play App Signing. Use `eas credentials -p android` to generate/manage the
EAS upload keystore; back it up securely. Record its SHA-1 fingerprint. In Play
Console → App integrity record the **app signing certificate SHA-1**, which is
not the upload certificate. Internal-track installs use Play's signing key;
sideloaded EAS APKs use the EAS keystore. Register Android OAuth clients in the
same Google Cloud project for `com.extrachill.app` plus **each signing SHA-1**.
Also register any separate development signing certificate used by local builds.
Do not copy keystores, private keys or service-account JSON into git.

### Verified server contract (not a new Android workaround)

Source inspection:
- [extrachill-api config route](https://github.com/Extra-Chill/extrachill-api/blob/e41c28eb850da161057416ce432fee3140542f7f/inc/routes/config/oauth.php)
- [extrachill-users Google service](https://github.com/Extra-Chill/extrachill-users/blob/bf3b9305d2ae1ee99dc07565bff09e7df8298255/inc/oauth/google-service.php)

`GET https://extrachill.com/wp-json/extrachill/v1/config/oauth` returns
`google.enabled`, `web_client_id`, `ios_client_id`, `android_client_id` and
`apple.enabled`. The Google fields are empty when the provider is disabled.
The Android field **already exists**; no missing-field server issue is needed.
Network/site options are:

| Returned field | WordPress network option |
| --- | --- |
| `web_client_id` | `extrachill_google_client_id` |
| `ios_client_id` | `extrachill_google_ios_client_id` |
| `android_client_id` | `extrachill_google_android_client_id` |

Set the Android client with `wp site option update extrachill_google_android_client_id
'[REPLACE ANDROID OAUTH CLIENT ID]'` (run as one command). Register both certificates
in Google Cloud even though the option holds one client ID; document which client
is recorded. Keep `extrachill_google_client_id` set to the **web** client ID.
The native Google SDK uses `webClientId` to request an ID token whose audience is
that web client, and identifies Android via package/signing certificate; it does
not accept an `androidClientId` configure option. `src/auth/oauth.ts` already
configures this correctly. The users service verifies the token against
`extrachill_google_client_id`; do not replace that audience with the Android ID
or relax verification. Validate the live endpoint and sign-in on both sideloaded
and Play-installed builds. Source inspection does not prove deployment settings.

Apple sign-in is iOS-only: `useAppleAuth` requires `Platform.OS === 'ios'`, server
enablement and native availability. Android must not display its button/divider
when Google is also disabled. Verify email/password and Google login on device.

## 4. Internal testing track and push credentials

Create the **internal testing** track and a tester list/Google Group; save the
opt-in URL and test with a real Play-installed build. Do not select production
rollout during initial setup.

For FCM V1 readiness:
1. Create/select the Firebase project and register Android app
   `com.extrachill.app`. Enable the Firebase Cloud Messaging API (V1).
2. Download its `google-services.json`. Create an EAS **file** environment variable
   named `GOOGLE_SERVICES_JSON` for each environment that needs push (for example
   `eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file
   --value /secure/path/google-services.json --visibility secret`). EAS supplies
   the mounted file path; do not put JSON text in the variable.
3. `app.config.ts` sets `android.googleServicesFile` only when that variable is
   present. With no variable it leaves Android configuration unchanged; prebuild
   works without Firebase. For local validation, export a path to a real file.
4. Generate a Firebase service account with appropriate FCM V1 permissions and
   upload it via `eas credentials -p android` → push notifications → FCM V1.
   This server credential is **not** `google-services.json` and is **not** the
   Play submission service account. Store all files outside the repository.
5. Validate notification permissions, token registration and foreground/background
   delivery on a physical release device once the push implementation is ready.
   This wiring alone does not implement push: the current app has no
   `expo-notifications` dependency/token-registration integration. Do not advertise
   push delivery as verified or add Firebase Analytics without updating disclosures.

## 5. Build the store AAB

EAS owns remote `versionCode` (`cli.appVersionSource: remote`); initialize/check it
with `eas build:version:set -p android` before the first release. Production
`autoIncrement: true` increments remotely; do not add a local `versionCode`.

```sh
npx expo config --type public
eas build -p android --profile production
```

Development builds are dev-client APKs; preview builds are internal APKs;
production builds are store AABs. Android native files are generated by EAS:
**do not commit `android/`**. The committed `ios/` tree and its Podfile/Xcode
fixes remain iOS-only. `eas-build-post-install` runs prebuild only when
`EAS_BUILD_PLATFORM=ios`, so it does nothing on Android. Do not use a clean iOS
prebuild to prepare Android or copy iOS native patches into generated Android.
The adaptive icon, package, dark splash variant and edge-to-edge setting live in
`app.json`; validate splash and system insets on Android devices.

## 6. Submit to internal testing

Create a dedicated Google Play API service account, enable the Google Play
Android Developer API, and grant only the app/track permissions needed in Play
Console. Store its JSON outside git. Replace
`submit.production.android.serviceAccountKeyPath` in `eas.json` with that secure
local path (or supply the credential through your secured release automation).
The committed path under ignored `credentials/` is deliberately nonfunctional.

Google requires the first AAB upload manually in Play Console before API-based
submission works; upload the production artifact to internal testing and finish
required declarations. Then submit subsequent builds:

```sh
eas submit -p android --profile production
```

This selects the `internal` track, not public rollout. Confirm the artifact,
version code, tester availability and signing identity in Play Console.

## Required Play declarations / submission gates

### Data safety draft — verify with the operator

Mirror the [iOS privacy draft](app-store.md#draft-app-privacy-answers--verify-before-publishing): data sent to Extra
Chill is collected off-device, linked to the account, and used for app
functionality, not cross-app tracking. Do **not** select “no data collected.”

| Play data type | Current behavior / purpose |
| --- | --- |
| Personal info → Email address, Name | Registration, profile, OAuth; account management/functionality |
| Personal info → User IDs | Account identity and authenticated API operations; account management |
| App activity → Other user-generated content | Community posts/replies and profile content; functionality |
| App activity → App interactions | Going marks / My Shows; functionality, not analytics telemetry |

Email/user ID are required for accounts; name/profile content and interactions
are user-provided/optional. Declare collection as non-ephemeral where retained.
Confirm optionality, retention and deletion with the backend operator before
submitting. Authentication providers are Google (and Apple on iOS); determine
any Play “sharing” disclosures using Google's service-provider/user-initiated
transfer exceptions rather than claiming all OAuth data is anonymous. No ads or
analytics SDK/instrumentation was found in the iOS audit; adding Firebase config
alone does not add Firebase Analytics. No camera/upload/location permission is
implemented. Confirm backend logs, linked web content, diagnostics, push tokens,
search retention and all SDK data practices for the shipped build. Verify HTTPS
for all transfers before answering “encrypted in transit.”

### Account deletion — web URL gap (submission blocker)

Native path: **You → Settings → Delete account**, only when the server advertises
support. Verify actual account/data deletion, not logout. Inspection of this app,
`extrachill-users` and `extrachill-api` did not establish a public web deletion
request page. **[REPLACE VERIFIED PUBLIC ACCOUNT-DELETION WEB URL]** is required
by Play even with in-app deletion. A REST endpoint, privacy policy or generic
contact link is not a verified substitute. Before submission, publish/verify a
page identifying Extra Chill, explaining how to request deletion and which data
is deleted/retained (with retention periods), and link it in Play Console.

### Content rating, audience, access

- Complete the IARC content-rating questionnaire honestly for community UGC,
  messaging, profanity/mature discussions and unrestricted web content. Do not
  invent a rating. No native gambling/paid contests are implemented.
- Target audience: **[REPLACE VERIFIED AGE GROUPS]**. This is a general music
  community, not a child-directed product; have the owner confirm age eligibility
  and content before selecting groups. Do not select children casually; assess
  Families policy if any child age group is selected. Declare no ads only after
  verifying the shipped app and web surfaces.
- UGC moderation is a release blocker as in the iOS runbook: verify reporting,
  blocking, moderation response, terms acceptance and safeguards. Do not claim
  native post-overflow report/block controls exist before implementation.
- App access: supply **[REPLACE REVIEW EMAIL / PASSWORD]** securely in Play Console,
  with a non-expiring representative account, no OTP/region/paywall barriers and
  explicit navigation instructions. Verify server availability, login, community,
  My Shows and deletion for review; never commit the review password.

## Local validation

Recorded: `npm run typecheck` passed; `npm test` passed (94 tests). Ran
`npx expo config --type public` and `npx expo prebuild --platform android --no-install`
in a temporary copy with no committed Android tree. Prebuild succeeded without
FCM credentials; it warned that `expo-system-ui` is needed for automatic
`userInterfaceStyle`. This does not block generation; verify light/dark behavior
on device. No Gradle compilation, signed build, live OAuth, push delivery or Play
submission has been claimed. Remaining operator placeholders and web deletion /
UGC / push implementation gates above must be resolved before release.
