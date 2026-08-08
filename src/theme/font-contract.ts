export type FontLoadState = 'loading' | 'ready' | 'fallback';

export function assertFontFamiliesRegistered(
    registeredFonts: Record<string, unknown>,
    configuredFamilies: Record<string, string>,
): void {
    for (const [weight, fontFamily] of Object.entries(configuredFamilies)) {
        if (!(fontFamily in registeredFonts)) {
            throw new Error(`Configured ${weight} font family "${fontFamily}" is not registered.`);
        }
    }
}

export function getFontLoadState(loaded: boolean, error: Error | null): FontLoadState {
    if (error) {
        return 'fallback';
    }

    return loaded ? 'ready' : 'loading';
}
