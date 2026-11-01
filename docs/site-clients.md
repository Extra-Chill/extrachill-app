# Site clients

Use `useSiteClient(root)` from `src/network/site-client.ts` for other network sites rather than deriving clients in screens. It returns `{ client, ready, error, retry }`.

Clients and discovery are shared per shell-client identity and REST root. Signing in or out to a new shell client gets a new cache entry. Navigating between screens reuses the entry, including any discovery failure; call `retry()` to try again. Failed discovery leaves `ready` false.

Reads that do not inspect the ability catalog can use `client` immediately. Gate capability checks and actions on `ready`, and recompute them when it changes. Do not interpret an undiscovered catalog as an unsupported ability. The blocked-members and event-detail screens provide discovery-error retry panels.

Verification for this change: `npm ci`, `npm run typecheck`, and `npm test` (78 passing tests). Device testing was not available. Installation reported 47 dependency vulnerabilities; dependency upgrades are outside this fix.
