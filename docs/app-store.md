# iOS App Store submission runbook

This prepares the repo without an Apple account. It does not create credentials,
App Store records, or production OAuth clients. Replace every placeholder below
before distributing a build. Release tooling owns `version` (currently 0.5.0)
and CHANGELOG; do not edit them for an App Store upload.

## Configuration and native-source decision

- `eas.json`: development is an internal simulator dev-client build; preview is
  internal device distribution (registered devices and Apple provisioning needed);
  production is a store build. EAS remote versioning owns `ios.buildNumber`, with
  production `autoIncrement`. Do not manually increment native build numbers.
- `app.json` retains release-owned/static configuration. `app.config.ts` only adds
  the Google plugin's environment-driven `iosUrlScheme`. The fallback
  `com.googleusercontent.apps.REPLACE_WITH_IOS_CLIENT_ID` is a nonfunctional,
  clearly marked placeholder, not a real client. No Apple credentials are in git.
- Replace `owner: replace-with-expo-owner` with the actual Expo account or organization.
  Replace the all-zero `extra.eas.projectId` with the UUID returned by `eas init`.
  Dynamic config means EAS may ask you to make this edit manually.
- `submit.production.ios.ascAppId` is the numeric App Store Connect app ID, not the
  bundle ID. `appleTeamId` is the Apple team's identifier. Both remain placeholders.
- Encryption declaration is false: the app uses HTTPS and no custom encryption.
  Source/dependency search found no camera, photo library, or OS notification
  permission requests. Inbox notifications are API data and settings control email,
  not push notifications. No permission usage strings were added. Secure Store's
  default Face ID string is explicitly disabled because biometric authentication
  is not requested by this app.
- Splash colors match `@extrachill/tokens`: light `#ffffff`, dark `#1a1a1a`.
  `expo-splash-screen` generates native dark/light assets; legacy splash config
  retains the same colors.

### Why `ios/` remains committed

Compared a clean temporary copy of HEAD against
`npx expo prebuild --platform ios --no-install` (with `ios/` removed only in that
copy). Most differences were generated CocoaPods integration, aggregated privacy
manifest, the old 0.1.0 plist version, and template changes. Two real custom fixes
were found and retained:

1. `ios/Podfile` post-install override invokes EXConstants' manifest script with
   `bash -l`, avoiding the original invocation/quoting issue.
2. `ios/ExtraChill.xcodeproj/project.pbxproj` React Native bundle phase resolves
   `RN_XCODE_SCRIPT` and invokes the quoted variable, preserving paths with spaces.

Do **not** run `expo prebuild --clean`: it removes these fixes. Non-clean prebuild
was tested in a temp copy and preserves both fixes. Updated native splash assets,
URL schemes, export-compliance flag and plist version are committed here.

Because EAS does not automatically prebuild a committed native tree,
`eas-build-post-install` runs non-clean iOS prebuild after dependency installation,
before CocoaPods/build, so the build environment's Google URL scheme and plugins
reach native files. The Google plugin appends schemes: remove the committed
placeholder scheme (and any stale Google client schemes) from `ios/ExtraChill/Info.plist`
before the first real-client prebuild, then commit the resulting real scheme.
Run the same command locally after config changes and inspect the diff. The Expo Doctor app-config-sync check is explicitly disabled for this
intentional workflow, not because EAS syncs these fields automatically. All other
Doctor checks remain enabled. Recheck this hook and both fixes on SDK upgrades.

## Account-dependent steps, in order

1. **Enroll in the Apple Developer Program.** Confirm the legal entity, team,
   agreements and App Store Connect roles. Install/login to EAS CLI (`npm install
   -g eas-cli`, `eas login`). An Expo account can be created before Apple enrollment.
2. **Register the App ID** `com.extrachill.app` in Certificates, Identifiers &
   Profiles and enable **Sign in with Apple**. Create the matching iOS app record
   in App Store Connect. Keep the bundle ID consistent everywhere.
3. **Activate server Apple sign-in** (operator follow-up; not performed by this PR):
   ```sh
   wp site option update extrachill_apple_bundle_id com.extrachill.app
   ```
   Run in the production WordPress multisite context. Confirm the app's OAuth
   config endpoint advertises Apple sign-in before testing it.
4. **Create the Google iOS OAuth client** for `com.extrachill.app`. Set
   `GOOGLE_IOS_URL_SCHEME` to its reversed client ID (for example
   `com.googleusercontent.apps.123456-example`, derived from the actual client,
   not this example). Store it as a plain-text EAS environment variable in each
   environment used (`development`, `preview`, `production`), for example:
   ```sh
   eas env:create --environment production --name GOOGLE_IOS_URL_SCHEME --value '<actual-reversed-client-id>' --visibility plaintext
   ```
   Also export the same variable locally before prebuild. It is a public URL
   scheme, not a client secret. The runtime Google SDK reads `ios_client_id` and
   `web_client_id` from the server OAuth config, not this build variable. Arrange
   for the server to return the matching iOS client ID and existing web client ID;
   verify both providers on a real device. Do not ship the fallback scheme.
5. **Link EAS:** set the real `owner`, remove the all-zero projectId placeholder,
   run `eas init`, and record the actual UUID in `app.json`. Fill the submission
   IDs in `eas.json`. Confirm `npx expo config --type public` resolves the expected
   owner, project, bundle ID and Google plugin options. Initialize/check remote
   iOS build numbering with `eas build:version:set -p ios` if prompted; choose a
   number greater than any existing App Store upload. Leave marketing versioning
   to release tooling.
6. **Credentials:** `eas credentials -p ios`. Let EAS manage the distribution
   certificate and provisioning profile with Sign in with Apple capability.
   Configure App Store Connect submission authentication (prefer an API key;
   keep the private key out of git). Complete store metadata, privacy disclosures,
   export compliance and review contact information in App Store Connect.
7. **Build:**
   ```sh
   eas build -p ios --profile production
   ```
   Check the build logs for successful non-clean prebuild and preserved native
   fixes. Inspect resolved native URL schemes; no placeholder may reach release.
8. **Submit:**
   ```sh
   eas submit -p ios --profile production --latest
   ```
   This uploads to App Store Connect, not directly to public release. Wait for
   processing, resolve compliance prompts and select the build for TestFlight.
9. **TestFlight internal testers:** add App Store Connect users as internal
   testers and assign the build. Test clean install, email/Google/Apple login,
   posts, Going/un-Going, account deletion, light/dark launch, and iPad layout.
   External testers require Beta App Review. After QA, attach the tested build
   to the store version and submit for App Review.

## Draft App Privacy answers — verify before publishing

This is a code-based draft, not a substitute for reviewing server retention,
logging and service-provider practices with the operator. Data sent to Extra
Chill to provide the account/community is collected off-device and linked to the
user. Declare **App Functionality**, **linked to identity**, **not used for
tracking** for:

| App Store data type | App behavior |
| --- | --- |
| Contact Info → Email Address, Name | Registration/profile and OAuth account details |
| Identifiers → User ID | Account identity and authenticated API operations |
| User Content → Other User Content | Community topics, replies/posts and profile content |
| Usage Data → Product Interaction | Event Going marks / My Shows linked to the account |

No tracking across other companies' apps/sites; no third-party ads in the app.
A search of `app/`, `src/` and dependencies found no analytics/ad SDK (including
Firebase Analytics, Segment, Amplitude, Mixpanel or Sentry) and no analytics event
instrumentation. Going marks are functional user data, not analytics telemetry.
Google and Apple SDKs are authentication providers. Tokens are stored in Secure
Store; do not describe authentication as anonymous. There is no camera/photo
upload or location permission in current code. Confirm whether backend logs,
linked web pages, or future SDKs introduce additional diagnostics, identifiers,
search-history retention, or collection before final answers. Do not claim
"Data Not Collected." Privacy policy: https://extrachill.com/privacy-policy/

## App Review notes (draft)

- Demo account: **[CREATE REVIEW EMAIL / PASSWORD]**. Supply a working non-expiring
  account, representative content and any reviewer instructions securely in App
  Store Connect. Verify the production server is reachable during review.
- Account deletion: **You → Settings → Delete account** (under You). This action
  depends on the server advertising account-deletion support; verify it is visible
  for the review account and completes deletion, not just logout.
- Intended report/block location: **Community post overflow menu**. **Submission
  blocker:** the current native Community source has no report/block overflow
  actions. Do not tell reviewers these exist yet. Implement and verify reporting,
  blocking, moderation handling and UGC safeguards before submission; this config
  task does not add those features.
- Privacy policy: https://extrachill.com/privacy-policy/
- Support URL: https://extrachill.com/contact-us/
- Sign in with Apple is available alongside Google when the server enables it.
  Test both on the submitted build. Explain user content and moderation controls
  in the final notes after they actually exist.

## Store listing draft

- **Name:** Extra Chill
- **Subtitle:** Your Online Music Scene (23 characters)
- **Category:** Music
- **Promotional text:** Find your people in the Online Music Scene. Talk independent
  music, discover shows, and keep track of the ones you're going to. No rush.
- **Description:**

  Extra Chill is the Online Music Scene: an independent music community built
  around the people who make it, love it, and show up for it.

  Find a conversation in Community. Start a topic, share a thought, or reply to
  someone who hears what you hear. Browse the show calendar and mark Going to
  keep your next nights out together in My Shows. Catch up with your Inbox, then
  make yourself at home in You.

  Calm, community-first, and here for independent music. Pull up a chair.

- **Keywords:** independent music,concerts,live music,community,shows,music scene
  (65 characters; limit 100).
- **Age rating:** complete Apple's current questionnaire honestly for UGC,
  messaging and unrestricted content access. Community posts may contain profanity
  or mature music discussions; assess actual content and moderation rather than
  promising a particular age rating. Confirm reporting/blocking/filtering and
  response processes before declaring safeguards. No gambling or paid contests
  are implemented in the native app.

## Screenshot plan

Capture the actual release build with seeded, permission-cleared community content
and no personal information, debug UI, placeholder providers or empty/error states.
Use short, calm captions; don't show features that aren't implemented.

1. Community topic list: the Online Music Scene.
2. Topic detail with a readable conversation and reply composer.
3. Calendar event list and event detail with Going.
4. You → My Shows and profile.
5. Inbox with representative notifications.

Supply 1–10 screenshots per supported device family. Since `supportsTablet` is
true, prepare both iPhone and iPad, not just iPhone. Target the current required
App Store Connect wells: **6.9-inch iPhone** (portrait 1320×2868; e.g. iPhone 16
Pro Max) and **13-inch iPad** (portrait 2064×2752; e.g. iPad Pro 13-inch).
Apple also accepts certain 6.5/6.7-inch and 12.9-inch assets for scaling; verify the
current screenshot-size table in App Store Connect at upload time and supply any
additional required well it requests. Optional smaller-device shots should be
captured natively, not stretched. Check light and dark UI; choose a consistent
set for the listing and retain both for QA. Simulator screenshots are suitable;
real-device TestFlight QA is still required.

## Validation recorded for this change

`npm run typecheck` passed. `npm test`: 43 passed, 0 failed.

`npx expo-doctor` output (the sync-check opt-out is explained above):

```text
The appConfigFieldsNotSyncedCheck is disabled. Set expo.doctor.appConfigFieldsNotSyncedCheck.enabled to true in package.json to re-enable this check.
Running 17 checks on your project...
17/17 checks passed. No issues detected!
```

No signed build, submission or server change was attempted without an account.
Follow-ups: Apple enrollment/App ID, server Apple activation, Google iOS client
and runtime config, Expo owner/project linking, remote version initialization,
credentials/submission IDs, demo account, UGC moderation controls, final privacy
answers, screenshots, device QA and TestFlight/App Review.
