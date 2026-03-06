/**
 * Design tokens for the Extra Chill app
 *
 * Derived from @extrachill/tokens — the platform's canonical source of truth.
 * This file adapts the token constants into the flat shape the app's
 * ThemeProvider and components expect (e.g. colors.accent vs colors.accent.light).
 *
 * App-specific tokens (badgeColors, fontFamily mapping) live here because
 * they're not platform-wide concerns.
 */

import {
	colors as tokenColors,
	spacing as tokenSpacing,
	borderRadius as tokenBorderRadius,
	fontSize as tokenFontSize,
} from '@extrachill/tokens';

// ─── Colors ──────────────────────────────────────────────────────────────────
// Flatten from { light, dark } token objects to simple string maps

function buildColorMap( scheme: 'light' | 'dark' ) {
	return {
		background: tokenColors.backgroundColor[ scheme ],
		text: tokenColors.textColor[ scheme ],
		link: tokenColors.linkColor[ scheme ],
		linkHover: tokenColors.linkColorHover[ scheme ],
		border: tokenColors.borderColor[ scheme ],
		accent: tokenColors.accent[ scheme ],
		accentHover: tokenColors.accentHover[ scheme ],
		accent2: tokenColors.accent2[ scheme ],
		accent3: tokenColors.accent3[ scheme ],
		error: tokenColors.errorColor[ scheme ],
		success: tokenColors.successColor[ scheme ],
		muted: tokenColors.mutedText[ scheme ],
		cardBackground: tokenColors.cardBackground[ scheme ],
		buttonText: tokenColors.buttonTextColor[ scheme ],
		noticeBg: tokenColors.noticeBg[ scheme ],
		noticeBorder: tokenColors.noticeBorder[ scheme ],
		headerBackground: tokenColors.headerBackground[ scheme ],
	};
}

export const colors = buildColorMap( 'light' );
export const darkColors = buildColorMap( 'dark' );

// ─── Spacing ─────────────────────────────────────────────────────────────────
// React Native uses numeric px values, so pull from the .px property

export const spacing = {
	xs: tokenSpacing.spacingXs.px,
	sm: tokenSpacing.spacingSm.px,
	md: tokenSpacing.spacingMd.px,
	lg: tokenSpacing.spacingLg.px,
	xl: tokenSpacing.spacingXl.px,
};

// ─── Border Radius ───────────────────────────────────────────────────────────
// Parse px string values to numbers for RN

export const borderRadius = {
	sm: parseInt( tokenBorderRadius.borderRadiusSm.value, 10 ),
	md: parseInt( tokenBorderRadius.borderRadiusMd.value, 10 ),
	lg: parseInt( tokenBorderRadius.borderRadiusLg.value, 10 ),
	xl: parseInt( tokenBorderRadius.borderRadiusXl.value, 10 ),
	pill: parseInt( tokenBorderRadius.borderRadiusPill.value, 10 ),
};

// ─── Font Sizes ──────────────────────────────────────────────────────────────
// React Native uses numeric px values

export const fontSize = {
	xs: tokenFontSize.fontSizeXs.px,
	sm: tokenFontSize.fontSizeSm.px,
	base: tokenFontSize.fontSizeBase.px,
	body: tokenFontSize.fontSizeBody.px,
	lg: tokenFontSize.fontSizeLg.px,
	xl: tokenFontSize.fontSizeXl.px,
	'2xl': tokenFontSize.fontSize2xl.px,
	'3xl': tokenFontSize.fontSize3xl.px,
	brand: tokenFontSize.fontSizeBrand.px,
};

// ─── App-Specific Tokens ─────────────────────────────────────────────────────
// These are not platform-wide — they live here, not in @extrachill/tokens

export const badgeColors = {
	artist: '#E21FC5',
	team: '#1fc5e2',
	professional: '#9D1FE2',
};

export const fontFamily = {
	body: 'Helvetica',
	heading: 'LoftSans',
	brand: 'Lobster',
};
