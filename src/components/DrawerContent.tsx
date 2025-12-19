/**
 * Drawer content menu.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useTheme } from '../theme/context';
import { useAuth } from '../auth/context';
import { Avatar } from './Avatar';

interface DrawerItemProps {
    label: string;
    onPress: () => void;
    danger?: boolean;
}

function DrawerItem({ label, onPress, danger = false }: DrawerItemProps) {
    const { colors, spacing, fontSize, fontFamily } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.item, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}
            activeOpacity={0.7}
        >
            <Text
                style={{
                    color: danger ? colors.error : colors.text,
                    fontSize: fontSize.body,
                    fontFamily: fontFamily.body,
                    fontWeight: '600',
                }}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

export function DrawerContent(props: DrawerContentComponentProps) {
    const { colors, spacing, fontSize, fontFamily } = useTheme();
    const { user, logout } = useAuth();

    const profileUrl = user?.profile_url;

    const openUrl = async (url: string) => {
        props.navigation.closeDrawer();
        await Linking.openURL(url);
    };

    const handleLogout = async () => {
        props.navigation.closeDrawer();
        await logout();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}> 
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: spacing.xl,
                        paddingHorizontal: spacing.lg,
                        paddingBottom: spacing.lg,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <Avatar url={user?.avatar_url} size={56} />
                <Text
                    style={{
                        marginTop: spacing.md,
                        color: colors.text,
                        fontSize: fontSize.lg,
                        fontFamily: fontFamily.heading,
                        fontWeight: '700',
                    }}
                >
                    {user?.display_name}
                </Text>
                <Text
                    style={{
                        marginTop: spacing.xs,
                        color: colors.muted,
                        fontSize: fontSize.base,
                        fontFamily: fontFamily.body,
                    }}
                >
                    @{user?.username}
                </Text>
            </View>

            <View style={{ paddingTop: spacing.sm }}>
                <DrawerItem
                    label="View Profile"
                    onPress={() => {
                        if (!profileUrl) return;
                        openUrl(profileUrl);
                    }}
                />
                <DrawerItem
                    label="Settings"
                    onPress={() => openUrl('https://community.extrachill.com/settings/')}
                />
            </View>

            <View style={{ marginTop: 'auto', paddingBottom: spacing.lg }}>
                <DrawerItem label="Sign Out" danger onPress={handleLogout} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        borderBottomWidth: 1,
    },
    item: {},
});
