export type FontLoadState = 'loading' | 'ready' | 'fallback';

export function assertFontFamiliesRegistered(
    registeredFonts: Record<string, unknown>,
    configuredFamilies: Record<string, string>,
): void;

export function getFontLoadState(loaded: boolean, error: Error | null): FontLoadState;
