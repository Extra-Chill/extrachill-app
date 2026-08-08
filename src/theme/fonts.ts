import type { FontSource } from 'expo-font';
import { assertFontFamiliesRegistered } from './font-contract';

export { getFontLoadState } from './font-contract';

export const registeredFonts = {
    Helvetica: require('../../assets/fonts/helvetica.ttf'),
    WilcoLoftSans: require('../../assets/fonts/WilcoLoftSans-Treble.ttf'),
} as const satisfies Record<string, FontSource>;

export type RegisteredFontName = keyof typeof registeredFonts;

export const themeFontFamilies = {
    regular: 'WilcoLoftSans',
} as const satisfies Record<'regular', RegisteredFontName>;

assertFontFamiliesRegistered(registeredFonts, themeFontFamilies);
