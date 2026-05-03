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
import { useTheme } from 'wp-native-shell';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
    label?: string;
    error?: string;
}

export function TextInput({
    label,
    error,
    ...props
}: TextInputProps) {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.text, fontSize: theme.typography.fontSizes.base, fontFamily: theme.typography.fontFamily }]}>
                    {label}
                </Text>
            )}
            <RNTextInput
                style={[
                    styles.input,
                    {
                        borderColor: error ? theme.colors.error : isFocused ? theme.colors.primary : theme.colors.border,
                        borderRadius: theme.radii.md,
                        paddingHorizontal: theme.spacing.md,
                        fontSize: theme.typography.fontSizes.base,
                        fontFamily: theme.typography.fontFamily,
                        color: theme.colors.text,
                        backgroundColor: theme.colors.background,
                    },
                ]}
                placeholderTextColor={theme.colors.textMuted}
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
                <Text style={[styles.error, { color: theme.colors.error, fontSize: theme.typography.fontSizes.sm }]}>
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
