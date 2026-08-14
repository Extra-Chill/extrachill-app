# Extra Chill App Product Charter

## Product Definition

The Extra Chill app is the Online Music Scene in your pocket: the people, music, events, conversations, and tools of the Extra Chill network delivered consistently across native platforms.

Extra Chill is the product and the human scene is its heart. `wp-native` is the cross-platform application substrate. Roadie is the universal conversational interface. Capability-driven workspaces let artists, venues, contributors, and team members operate the parts of the scene they own.

The product promise is:

> Discover the scene, participate in it, and keep your part of it moving from anywhere.

## Product Principles

- **Scene first:** people, music, events, and conversations remain the reason to open the app.
- **Consistent behavior:** native screens, Roadie tools, and web interfaces call the same domain-owned abilities.
- **Roadie everywhere:** Roadie can guide or operate any supported surface with the current workspace and object as context.
- **Workspaces by capability:** artist, venue, editorial, community, and team tools appear only when the server reports the required access.
- **Server-owned capability:** the app does not duplicate Roadie's tools, role policy, prompts, or domain authorization.
- **Abilities over bespoke routes:** consume canonical WordPress and Agents API abilities rather than creating an app-specific backend.
- **Right interface for the task:** use conversation for intent and multi-step work; use structured native surfaces for scanning, comparison, exact editing, calendars, pipelines, and previews.
- **Human approval:** consequential actions remain visible and reviewable through pending-action contracts.
- **One platform identity:** sessions and permissions follow the authenticated Extra Chill user across the multisite network.
- **No thin web wrapper:** browser handoff is a supported escape hatch, not the primary application architecture.
- **No engagement machinery:** the app supports real work and relationships, not follower counts, popularity ranking, or synthetic activity.

## Initial Audience

The product is for the full Extra Chill scene. Delivery begins with a team-only native beta because Roadie's current production entitlement provides a bounded group that can exercise high-value workflows daily and prove the shared contracts before public distribution.

Expansion follows proven authorization boundaries:

1. Extra Chill team and administrators.
2. Venue operators through venue-scoped Roadie instances.
3. Artist owners and contributors through owner-scoped capabilities.
4. Members through profile, community, Local Scene, notification, and other user-owned abilities.

The app must not widen access merely to make a tool visible. Domain abilities remain authoritative for resource ownership and mutation permission.

## Primary Surfaces

### Scene

The human and music-centered home. It is composed from explicit, calm sections rather than an engagement-ranked infinite feed.

- Tonight and this weekend in the user's Local Scene.
- New community conversations and direct participation opportunities.
- Recent independent music coverage.
- Artists and venues participating in the platform.
- Upcoming shows and relevant personal activity.
- Work requiring the user's attention when they have operating capabilities.

### Calendar

Live music discovery and the user's concert relationship with the scene.

- Local Scene calendar and event detail.
- Going, Check In, and I Was There.
- My Shows and relevant event notifications.
- Artist, venue, and community context around an event.

### Roadie

The persistent conversational interface, available globally and full-screen when needed.

- Active conversation.
- Conversation history and new-session controls.
- Agent selection when the user has access to scoped Roadie instances.
- Suggested starting actions based on server-reported capabilities.
- Attachments from camera, photo library, files, and voice notes.
- Native rendering for questions, citations, tool results, progress, artifacts, and errors.
- Current Scene, event, artist, venue, discussion, booking, or draft context supplied by the app.

### Inbox

Things that need the user's attention.

- Pending approvals.
- Questions Roadie is waiting on.
- Completed background work.
- Community replies, booking activity, and relevant platform notifications.
- Deep links back to the owning conversation and object.

### You

Identity and app-level controls.

- Current account and entitlement summary.
- Managed artists, venues, drafts, and other capability-driven workspaces.
- Notification preferences.
- Session and security controls.
- Privacy, support, and account-management links.

### Workspaces

Workspaces are reached from `You`, relevant Scene objects, Inbox items, and Roadie results. They are not a separate admin universe.

- **Artist:** profile, links, assets, preview, submissions, and analytics.
- **Venue:** booking inbox, inquiry detail, correspondence, calendar, files, and status.
- **Editorial:** drafts, assignments, review, and Intelligence.
- **Community:** profile, discussions, notifications, and Local Scene participation.
- **Team:** issues, diagnostics, code proposals, approvals, and platform operations.

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
Structured native surface ─┐
Roadie tool ────────────────┼─> domain-owned WordPress ability
Web interface ──────────────┘

React Native application
  -> wp-native auth, discovery, transport, and shell behavior
  -> WordPress Abilities API and canonical Agents API contracts
```

### Cross-Platform Behavior

`wp-native` establishes the common client behavior for iOS and Android and a reusable contract for other JavaScript consumers. WordPress abilities establish the authoritative product behavior across every interface.

For any operation, structured native UI and Roadie must converge on the same ability. Ownership, validation, sanitization, side effects, errors, and returned data must not vary by interface. Platform-native presentation may vary because a booking pipeline, artist preview, event calendar, and conversation each need different interaction models.

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

Roadie helps people discover and participate in the scene; it does not replace the people or content with synthetic activity. Every structured surface should be able to provide its current workspace and object to Roadie, while every Roadie result should be able to return the user to the appropriate structured surface.

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

### M1: Native Platform Beta

- Scene shell with explicit, non-ranked sections backed by existing abilities.
- Persistent Roadie entry point and full-screen conversation.
- Session list, resume, rename, and delete.
- Message composer and canonical message rendering.
- Question, citation, tool-result, progress, artifact, and error states.
- Pending-action approve/reject flow.
- File and image attachments.
- Browser handoff for unsupported destinations.
- Crash reporting and privacy-safe beta instrumentation.

### M2: Scene, Calendar, and Inbox

- Local Scene, Calendar, event detail, and My Shows composition.
- Community and editorial sections sourced from domain abilities.
- Pending approvals and unanswered questions.
- Background run completion handling.
- Push registration and bounded notification delivery.
- Deep links to conversations, approvals, and supported platform objects.

### M3: Capability-Driven Workspaces

- Venue Roadie selection and booking workflows.
- Artist, venue, editorial, community, and team structured surfaces where repeated workflows justify them.
- Artist-owner and contributor access after server entitlement support is proven.
- Contextual suggestions based on accessible capabilities, never client-inferred roles.

### M4: Public Distribution

- App Store and Play Store release infrastructure.
- Account management and deletion requirements.
- Platform privacy disclosures and support surfaces.
- Broader member Roadie surface after owner/member authorization is proven.

## Beta Acceptance Criteria

- A team member can complete a useful Roadie workflow from a physical iOS or Android device.
- Structured UI and Roadie produce the same authorized behavior for the same domain operation.
- The same Roadie conversation is visible across the app and existing web surface.
- Every tool call is authorized as the authenticated user by the server.
- Pending actions require explicit approval and preserve their canonical origin.
- Background work remains inspectable after the app closes and reopens.
- Unsupported destinations use authenticated browser handoff without losing context.
- No Roadie tool list, role map, or domain mutation policy is duplicated in the app.
- Failures identify whether authentication, transport, runtime, or tool execution failed.

## Explicitly Deferred

- Rebuilding every Extra Chill site as native screens.
- A generalized activity feed.
- Native Gutenberg before the Roadie writing workflow proves the required editor boundary.
- Native commerce.
- Public app-store launch before the team beta demonstrates recurring utility.
- A new app-owned chat, notification, transcript, or approval substrate.

## Success Measures

The beta should answer whether the app strengthens participation in the scene and makes platform work easier from a phone:

- Weekly active team users.
- Useful workflows completed by tool family.
- Scene, event, community, and editorial participation.
- Time from request to approved completion.
- Conversation and work-item return rate.
- Pending-action completion and abandonment.
- Browser handoff frequency, used to identify native surfaces worth building.
- Error-free and crash-free sessions.

Downloads and message volume are not success measures by themselves.
