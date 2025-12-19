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
                <Text style={[styles.label, { color: colors.text, fontSize: fontSize.base, fontFamily: fontFamily.body }]}>
                    {label}
                </Text>
            )}
            <RNTextInput
                style={[
                    styles.input,
                    {
                        borderColor: error ? colors.error : isFocused ? colors.accent : colors.border,
                        borderRadius: borderRadius.md,
                        paddingHorizontal: spacing.md,
                        fontSize: fontSize.base,
                        fontFamily: fontFamily.body,
                        color: colors.text,
                        backgroundColor: colors.background,
                    },
                ]}
                placeholderTextColor={colors.muted}
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
                <Text style={[styles.error, { color: colors.error, fontSize: fontSize.sm }]}>
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
