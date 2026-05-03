/**
 * User avatar component.
 */

import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'wp-native-shell';

interface AvatarProps {
    url?: string;
    size?: number;
    onPress?: () => void;
}

export function Avatar({ url, size = 32, onPress }: AvatarProps) {
    const theme = useTheme();

    const avatar = (
        <View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                },
            ]}
        >
            {url ? (
                <Image
                    source={{ uri: url }}
                    style={{ width: size, height: size, borderRadius: size / 2 }}
                    resizeMode="cover"
                />
            ) : null}
        </View>
    );

    if (!onPress) {
        return avatar;
    }

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            {avatar}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        overflow: 'hidden',
    },
});
