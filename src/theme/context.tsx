/**
 * Theme context with automatic dark mode detection
 */

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkColors, spacing, borderRadius, fontSize, badgeColors } from '../root';

type Colors = typeof colors;

interface Theme {
    colors: Colors;
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
    fontSize: typeof fontSize;
    badgeColors: typeof badgeColors;
    isDark: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme: Theme = {
        colors: isDark ? darkColors : colors,
        spacing,
        borderRadius,
        fontSize,
        badgeColors,
        isDark,
    };

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): Theme {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
}
