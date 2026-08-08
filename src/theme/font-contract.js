function assertFontFamiliesRegistered(registeredFonts, configuredFamilies) {
    for (const [weight, fontFamily] of Object.entries(configuredFamilies)) {
        if (!(fontFamily in registeredFonts)) {
            throw new Error(`Configured ${weight} font family "${fontFamily}" is not registered.`);
        }
    }
}

function getFontLoadState(loaded, error) {
    if (error) {
        return 'fallback';
    }

    return loaded ? 'ready' : 'loading';
}

module.exports = { assertFontFamiliesRegistered, getFontLoadState };
