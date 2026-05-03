/**
 * Checkbox component matching theme styles
 *
 * Mirrors extrachill/style.css checkbox styling:
 * - 18x18px box with 2px border
 * - 5px border-radius (borderRadiusSm)
 * - Accent background when checked with white checkmark
 * - 0.5 opacity when disabled
 */

import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'wp-native-shell';

interface CheckboxProps {
    label: string;
    checked: boolean;
    onPress?: () => void;
    disabled?: boolean;
}

export function Checkbox({ label, checked, onPress, disabled = false }: CheckboxProps) {
    const theme = useTheme();

    return (
        <Pressable
            style={styles.container}
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
        >
            <View
                style={[
                    styles.box,
                    {
                        borderColor: checked ? theme.colors.primary : theme.colors.border,
                        borderRadius: theme.radii.sm,
                        backgroundColor: checked ? theme.colors.primary : theme.colors.background,
                    },
                    disabled && styles.disabled,
                ]}
            >
                {checked && <Text style={styles.checkmark}>{'\u2714'}</Text>}
            </View>
            <Text
                style={[
                    styles.label,
                    {
                        color: disabled ? theme.colors.textMuted : theme.colors.text,
                        fontSize: theme.typography.fontSizes.base,
                        fontFamily: theme.typography.fontFamily,
                        marginLeft: theme.spacing.sm,
                    },
                    disabled && styles.disabled,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    box: {
        width: 18,
        height: 18,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        marginTop: -1,
    },
    label: {},
    disabled: {
        opacity: 0.5,
    },
});
