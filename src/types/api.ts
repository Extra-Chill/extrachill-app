/**
 * API types — re-exported from @extrachill/api-client.
 *
 * Consumers import from here for backwards compatibility.
 * All types are defined in the shared package.
 */

export type {
  // Auth
  AuthUser,
  LoginResponse,
  RegisterResponse,
  RefreshResponse,
  GoogleLoginResponse,
  BrowserHandoffResponse,
  AuthMeResponse,
  OAuthConfigResponse,

  // Users
  OnboardingStatusResponse,
  OnboardingSubmitResponse,

  // Common
  ApiErrorResponse as ApiError,
} from '@extrachill/api-client';
