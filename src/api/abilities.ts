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
