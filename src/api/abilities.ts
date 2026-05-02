/**
 * Ability execution helper.
 *
 * Calls abilities via the wp-abilities REST endpoint:
 *   POST /wp-json/wp-abilities/v1/abilities/{name}/run
 *   GET  /wp-json/wp-abilities/v1/abilities/{name}/run
 *
 * The REST endpoint wraps every result in `{ result: <value> }`. These
 * helpers unwrap the envelope so callers receive the value directly.
 *
 * Auth is handled by AuthFetchTransport (Bearer token from secure storage).
 *
 * TODO(M7.2.5): replace `transport` import with useAuth().client from
 * wp-native-shell, and convert executeAbility / queryAbility to a hook
 * (useExecuteAbility) called from inside components. The current
 * implementation depends on `src/api/client.ts` which gets deleted
 * when <WPNativeApp/> mounts — wp-native-shell's AuthProvider builds
 * its own AuthFetchTransport from config.tokenStorage.
 *
 * Until M7.2.5 lands, this file uses the global `transport` because
 * the wp-native AuthProvider isn't mounted yet.
 */

import { transport } from './client';

/**
 * The wire-format envelope returned by /wp-abilities/v1/abilities/{name}/run.
 */
interface AbilityResponse<T> {
  result: T;
}

/**
 * Execute a mutating ability (POST).
 *
 * Sends `{ input }` in the request body and returns the unwrapped result.
 */
export async function executeAbility<T = unknown>(
  abilityName: string,
  input: Record<string, unknown> | null = null,
): Promise<T> {
  const response = await transport.request<AbilityResponse<T>>({
    path: `wp-abilities/v1/abilities/${abilityName}/run`,
    method: 'POST',
    body: { input },
  });
  return response.result;
}

/**
 * Execute a readonly ability (GET).
 *
 * Passes input as a JSON-encoded query parameter.
 * Use this for abilities annotated with `readonly: true`. Returns the
 * unwrapped result (same envelope handling as `executeAbility`).
 */
export async function queryAbility<T = unknown>(
  abilityName: string,
  input?: Record<string, unknown>,
): Promise<T> {
  const query = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : '';
  const response = await transport.request<AbilityResponse<T>>({
    path: `wp-abilities/v1/abilities/${abilityName}/run${query}`,
    method: 'GET',
  });
  return response.result;
}
