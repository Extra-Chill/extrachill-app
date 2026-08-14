# Extra Chill App Product Charter

## Product Definition

The Extra Chill app is Roadie in your pocket: a conversational operating interface for everything a person is authorized to do across the Extra Chill network.

Roadie is the default app surface, not a secondary assistant attached to a collection of conventional native screens. The app should let people ask for work in plain language, inspect the result, approve consequential actions, and move into a structured native or web surface when that is the better interface.

The product promise is:

> Ask Extra Chill to help, review what it did, and keep the work moving from anywhere.

## Product Principles

- **Roadie first:** open into the active Roadie conversation.
- **Server-owned capability:** the app does not duplicate Roadie's tools, role policy, prompts, or domain authorization.
- **Abilities over bespoke routes:** consume canonical WordPress and Agents API abilities rather than creating an app-specific backend.
- **Structured when useful:** chat handles the long tail; repeated or information-dense work can earn a native surface.
- **Human approval:** consequential actions remain visible and reviewable through pending-action contracts.
- **One platform identity:** sessions and permissions follow the authenticated Extra Chill user across the multisite network.
- **No thin web wrapper:** browser handoff is a supported escape hatch, not the primary application architecture.
- **No engagement machinery:** the app supports real work and relationships, not follower counts, popularity ranking, or synthetic activity.

## Initial Audience

The first release is a team-only native beta. This matches Roadie's current production entitlement and provides a bounded group that can exercise high-value workflows daily.

Expansion follows proven authorization boundaries:

1. Extra Chill team and administrators.
2. Venue operators through venue-scoped Roadie instances.
3. Artist owners and contributors through owner-scoped capabilities.
4. Members through profile, community, Local Scene, notification, and other user-owned abilities.

The app must not widen access merely to make a tool visible. Domain abilities remain authoritative for resource ownership and mutation permission.

## Primary Navigation

### Roadie

The default screen and primary command surface.

- Active conversation.
- Conversation history and new-session controls.
- Agent selection when the user has access to scoped Roadie instances.
- Suggested starting actions based on server-reported capabilities.
- Attachments from camera, photo library, files, and voice notes.
- Native rendering for questions, citations, tool results, progress, artifacts, and errors.

### Work

A durable view of work that outlives one chat turn.

- Active and recently completed runs.
- Drafts, booking work, proposed changes, and other returned artifacts.
- Retry, cancel, resume, or open actions when supported by canonical contracts.
- Links into the relevant native surface or authenticated browser handoff.

### Inbox

Things that need the user's attention.

- Pending approvals.
- Questions Roadie is waiting on.
- Completed background work.
- Relevant platform notifications.
- Deep links back to the owning conversation and object.

### You

Identity and app-level controls.

- Current account and entitlement summary.
- Managed artists and venues.
- Notification preferences.
- Session and security controls.
- Privacy, support, and account-management links.

## Existing Foundation

The repository already provides:

- Expo and React Native application shell.
- `wp-native-client` and `wp-native-shell` integration.
- Bearer-token authentication with secure token storage and refresh rotation.
- Login, registration, Google authentication, and onboarding.
- WordPress Abilities API discovery and execution.
- Authenticated browser handoff for Extra Chill network URLs.
- Extra Chill design tokens and native fonts.

The production platform already provides:

- The canonical `agents/chat` ability.
- Accessible-agent discovery.
- Conversation session lifecycle abilities.
- Chat run status, events, cancellation, and message queueing.
- Generic pending-action resolution.
- Roadie's role-aware tools, modes, network workspace, and scoped agent instances.
- Agenttic client and UI behavior that defines the existing browser experience.

## Architecture

```text
React Native app
  -> wp-native bearer transport
  -> canonical Agents API REST / ability contracts
  -> Roadie agent and mode
  -> Roadie tools
  -> domain-owned Extra Chill abilities
```

### Client Boundary

The native app owns:

- Authentication state and secure token storage.
- Native navigation and presentation.
- Local optimistic UI where the server contract permits it.
- Device integrations such as camera, files, voice, notifications, and deep links.
- Rendering canonical agent messages and structured tool results.

The native app does not own:

- A hardcoded inventory of Roadie capabilities.
- Extra Chill role or resource authorization.
- Tool execution policy.
- Conversation or pending-action storage.
- A parallel chat endpoint or transcript system.

### Roadie Boundary

Roadie remains the Extra Chill policy and integration layer. It selects tools, composes Extra Chill context, resolves caller scope, and bridges to domain-owned abilities.

Roadie's current browser integration composes important mode, workspace, page-context, and pending-action inputs through `frontend_agent_chat_*` filters. Before the native app depends on chat, that composition must be available through a client-neutral canonical boundary. Do not copy the browser adapter into the app and do not add a Roadie-specific transport to a generic layer.

### UI Reuse

Reuse the canonical Agenttic client message and tool-result contracts where they are runtime-compatible. The existing Agenttic UI is DOM-oriented and is not assumed to render in React Native.

Build the smallest native renderer for the canonical shapes required by the beta:

- User and assistant messages.
- Tool activity and summaries.
- Citations and links.
- Multiple-choice questions.
- Pending-action previews and decisions.
- Run progress, artifacts, cancellation, and failure states.

Do not design a generic native card framework before these concrete consumers prove a shared need.

## Milestones

### M0: Contract Proof

Prove one authenticated team member can use a development build to:

1. Discover Roadie through the canonical accessible-agent contract.
2. Create or resume a network-scoped conversation.
3. Send a message using the wp-native bearer token.
4. Receive and render the canonical response.
5. Observe run progress and reload persisted history.
6. Resolve a generic pending action without bypassing Roadie or domain permissions.

This milestone decides the client boundary before substantial UI work begins.

### M1: Roadie Native Beta

- Roadie-first home screen.
- Session list, resume, rename, and delete.
- Message composer and canonical message rendering.
- Question, citation, tool-result, progress, artifact, and error states.
- Pending-action approve/reject flow.
- File and image attachments.
- Browser handoff for unsupported destinations.
- Crash reporting and privacy-safe beta instrumentation.

### M2: Work and Inbox

- Active and completed work view.
- Pending approvals and unanswered questions.
- Background run completion handling.
- Push registration and bounded notification delivery.
- Deep links to conversations, approvals, and supported platform objects.

### M3: Scoped Operators

- Venue Roadie selection and booking workflows.
- Artist-owner and contributor access after the server entitlement model supports them.
- Contextual suggestions based on accessible capabilities, never client-inferred roles.

### M4: Public Distribution

- App Store and Play Store release infrastructure.
- Account management and deletion requirements.
- Platform privacy disclosures and support surfaces.
- Broader member Roadie surface after owner/member authorization is proven.

## Beta Acceptance Criteria

- A team member can complete a useful Roadie workflow from a physical iOS or Android device.
- The same Roadie conversation is visible across the app and existing web surface.
- Every tool call is authorized as the authenticated user by the server.
- Pending actions require explicit approval and preserve their canonical origin.
- Background work remains inspectable after the app closes and reopens.
- Unsupported destinations use authenticated browser handoff without losing context.
- No Roadie tool list, role map, or domain mutation policy is duplicated in the app.
- Failures identify whether authentication, transport, runtime, or tool execution failed.

## Explicitly Deferred

- Rebuilding every Extra Chill site as native screens.
- An Events-first application structure.
- A generalized activity feed.
- Native Gutenberg before the Roadie writing workflow proves the required editor boundary.
- Native commerce.
- Public app-store launch before the team beta demonstrates recurring utility.
- A new app-owned chat, notification, transcript, or approval substrate.

## Success Measures

The team beta should answer whether Roadie makes platform work easier from a phone:

- Weekly active team users.
- Useful workflows completed by tool family.
- Time from request to approved completion.
- Conversation and work-item return rate.
- Pending-action completion and abandonment.
- Browser handoff frequency, used to identify native surfaces worth building.
- Error-free and crash-free sessions.

Downloads and message volume are not success measures by themselves.
