export type MethodKind = 'app' | 'email' | 'backup' | 'other';
export interface ChallengeProvider { key: string; label: string; kind: MethodKind }
export interface TwoFactorChallenge {
    policy: string;
    provider: string;
    providers: ChallengeProvider[];
    continuationToken: string;
    /** Epoch milliseconds, or null when the server sent no expiry. */
    expiresAt: number | null;
}
export interface RotatedContinuation { continuationToken: string; expiresAt: number | null }
export type ContinueFailure =
    | { kind: 'expired' }
    | { kind: 'reset_required' }
    | { kind: 'rate_limited'; retryAfter: number; rotated: RotatedContinuation | null }
    | { kind: 'busy' }
    | { kind: 'invalid'; rotated: RotatedContinuation | null }
    | { kind: 'failed' };
export interface SignInState {
    challenge: TwoFactorChallenge;
    provider: string;
    code: string;
    status: 'idle' | 'submitting' | 'sending';
    error: string;
    notice: string;
    retryUntil: number;
    outcome: null | 'signed_in' | 'expired' | 'reset_required';
}
export type SignInAction =
    | { type: 'select'; provider: string }
    | { type: 'code'; value: string }
    | { type: 'submit' }
    | { type: 'resend' }
    | { type: 'signed_in' }
    | { type: 'code_sent' }
    | { type: 'challenge'; challenge: TwoFactorChallenge; sent?: boolean }
    | { type: 'expired' }
    | { type: 'failed'; failure: ContinueFailure; now: number }
    | { type: 'tick'; now: number };

export interface SecurityProvider extends ChallengeProvider {
    supported: boolean;
    configured: boolean;
    enabled: boolean;
    primary: boolean;
    remaining: number | null;
}
export interface ProviderSettings { userId: number; providers: SecurityProvider[]; revalidationRequired: boolean }
export interface SettingsSummary {
    on: boolean;
    primary: SecurityProvider | null;
    app: SecurityProvider | null;
    email: SecurityProvider | null;
    backup: SecurityProvider | null;
}
export interface ProviderPayload { enabled_providers: string[]; primary_provider: string }
export type ProviderChange = { enable: string } | { disable: string } | { primary: string };

export const TWO_FACTOR_CHALLENGE: 'two_factor';
export const DEFAULT_RETRY_SECONDS: number;
export const MAX_CODE_LENGTH: number;
export const SIGN_IN_COPY: Record<'invalid' | 'rateLimited' | 'busy' | 'failed' | 'codeSent' | 'expired' | 'resetRequired' | 'unsupported', string>;
export function providerKind(key: unknown): MethodKind;
export function methodCopy(provider: { key?: string; label?: string; kind?: MethodKind }): { title: string; prompt: string };
export function sanitizeCode(value: unknown): string;
export function codeReady(kind: MethodKind, code: string): boolean;
export function isChallengeRequired(result: unknown): boolean;
export function parseTwoFactorChallenge(result: unknown): TwoFactorChallenge | null;
export function isChallengeExpired(challenge: TwoFactorChallenge | null, now: number): boolean;
export function classifyContinueError(error: unknown): ContinueFailure;
export function createSignInState(challenge: TwoFactorChallenge): SignInState;
export function signInReducer(state: SignInState, action: SignInAction): SignInState;
export function secondsLeft(state: SignInState, now: number): number;
export function currentProvider(state: SignInState): ChallengeProvider;
export function canSubmitCode(state: SignInState, now: number): boolean;
export function canResend(state: SignInState, now: number): boolean;
export function parseProviderSettings(response: unknown): ProviderSettings;
export function settingsSummary(settings: ProviderSettings): SettingsSummary;
export function providerUpdate(settings: ProviderSettings, change: ProviderChange): ProviderPayload;
export function formatSecret(secret: unknown): string;
export function safeOtpauthUri(uri: unknown): string;
export function backupCodesText(codes: string[]): string;
export function securityError(error: unknown): string;
export function parseRevalidateChallenge(response: unknown): { provider: string; providers: ChallengeProvider[] } | null;
export function statusLine(summary: SettingsSummary): string;
