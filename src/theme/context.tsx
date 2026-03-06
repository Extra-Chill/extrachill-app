/**
 * Theme context — resolves @extrachill/tokens for React Native
 *
 * Imports canonical tokens directly and resolves light/dark based on
 * the device color scheme. Components use the canonical token key names
 * (e.g. theme.colors.accent, theme.spacing.spacingMd, theme.fontSize.fontSizeXl).
 *
 * App-specific tokens (badgeColors, fontFamily) are defined here since
 * they're not platform-wide concerns.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
	colors as tokenColors,
	spacing as tokenSpacing,
	borderRadius as tokenBorderRadius,
	fontSize as tokenFontSize,
	type ColorTokenKey,
} from '@extrachill/tokens';

// ─── Resolved color map ──────────────────────────────────────────────────────
// Flattens ColorToken objects into scheme-resolved strings

type ResolvedColors = Record< ColorTokenKey, string >;

function resolveColors( scheme: 'light' | 'dark' ): ResolvedColors {
	const resolved = {} as ResolvedColors;
	for ( const key of Object.keys( tokenColors ) as ColorTokenKey[] ) {
		resolved[ key ] = tokenColors[ key ][ scheme ];
	}
	return resolved;
}

// ─── Numeric token maps ──────────────────────────────────────────────────────
// React Native needs numbers, not CSS strings

const spacing = {
	spacingXs: tokenSpacing.spacingXs.px,
	spacingSm: tokenSpacing.spacingSm.px,
	spacingMd: tokenSpacing.spacingMd.px,
	spacingLg: tokenSpacing.spacingLg.px,
	spacingXl: tokenSpacing.spacingXl.px,
} as const;

const borderRadiusValues = {
	borderRadiusSm: parseInt( tokenBorderRadius.borderRadiusSm.value, 10 ),
	borderRadiusMd: parseInt( tokenBorderRadius.borderRadiusMd.value, 10 ),
	borderRadiusLg: parseInt( tokenBorderRadius.borderRadiusLg.value, 10 ),
	borderRadiusXl: parseInt( tokenBorderRadius.borderRadiusXl.value, 10 ),
	borderRadiusPill: parseInt( tokenBorderRadius.borderRadiusPill.value, 10 ),
} as const;

const fontSizeValues = {
	fontSizeXs: tokenFontSize.fontSizeXs.px,
	fontSizeSm: tokenFontSize.fontSizeSm.px,
	fontSizeBase: tokenFontSize.fontSizeBase.px,
	fontSizeBody: tokenFontSize.fontSizeBody.px,
	fontSizeLg: tokenFontSize.fontSizeLg.px,
	fontSizeXl: tokenFontSize.fontSizeXl.px,
	fontSize2xl: tokenFontSize.fontSize2xl.px,
	fontSize3xl: tokenFontSize.fontSize3xl.px,
	fontSizeBrand: tokenFontSize.fontSizeBrand.px,
} as const;

// ─── App-specific tokens ─────────────────────────────────────────────────────

export const badgeColors = {
	artist: '#E21FC5',
	team: '#1fc5e2',
	professional: '#9D1FE2',
} as const;

export const fontFamily = {
	body: 'Helvetica',
	heading: 'LoftSans',
	brand: 'Lobster',
} as const;

// ─── Theme type & context ────────────────────────────────────────────────────

export interface Theme {
	colors: ResolvedColors;
	spacing: typeof spacing;
	borderRadius: typeof borderRadiusValues;
	fontSize: typeof fontSizeValues;
	fontFamily: typeof fontFamily;
	badgeColors: typeof badgeColors;
	isDark: boolean;
}

const ThemeContext = createContext< Theme | null >( null );

export function ThemeProvider( { children }: { children: React.ReactNode } ) {
	const colorScheme = useColorScheme();
	const isDark = colorScheme === 'dark';

	const theme: Theme = useMemo( () => ( {
		colors: resolveColors( isDark ? 'dark' : 'light' ),
		spacing,
		borderRadius: borderRadiusValues,
		fontSize: fontSizeValues,
		fontFamily,
		badgeColors,
		isDark,
	} ), [ isDark ] );

	return (
		<ThemeContext.Provider value={ theme }>
			{ children }
		</ThemeContext.Provider>
	);
}

export function useTheme(): Theme {
	const context = useContext( ThemeContext );

	if ( ! context ) {
		throw new Error( 'useTheme must be used within a ThemeProvider' );
	}

	return context;
}
