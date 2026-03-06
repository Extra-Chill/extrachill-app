/**
 * TextInput component with themed styling
 */

import React, { useState } from 'react';
import {
    TextInput as RNTextInput,
    View,
    Text,
    StyleSheet,
    TextInputProps as RNTextInputProps,
} from 'react-native';
import { useTheme } from '../theme/context';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
    label?: string;
    error?: string;
}

export function TextInput({
    label,
    error,
    ...props
}: TextInputProps) {
    const { colors, spacing, borderRadius, fontSize, fontFamily } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: colors.textColor, fontSize: fontSize.fontSizeBase, fontFamily: fontFamily.body }]}>
                    {label}
                </Text>
            )}
            <RNTextInput
                style={[
                    styles.input,
                    {
                        borderColor: error ? colors.errorColor : isFocused ? colors.accent : colors.borderColor,
                        borderRadius: borderRadius.borderRadiusMd,
                        paddingHorizontal: spacing.spacingMd,
                        fontSize: fontSize.fontSizeBase,
                        fontFamily: fontFamily.body,
                        color: colors.textColor,
                        backgroundColor: colors.backgroundColor,
                    },
                ]}
                placeholderTextColor={colors.mutedText}
                onFocus={(e) => {
                    setIsFocused(true);
                    props.onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    props.onBlur?.(e);
                }}
                {...props}
            />
            {error && (
                <Text style={[styles.error, { color: colors.errorColor, fontSize: fontSize.fontSizeSm }]}>
                    {error}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        marginBottom: 6,
        fontWeight: '500',
    },
    input: {
        height: 48,
        borderWidth: 1,
    },
    error: {
        marginTop: 4,
    },
});
