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

  // Activity
  ActivityObject,
  ActivityCardData,
  ActivityTaxonomyTerm,
  ActivityItemData,
  ActivityItem,
  ActivityResponse,
  HydratedObject,

  // Common
  ApiErrorResponse as ApiError,
} from '@extrachill/api-client';
