/**
 * Drawer content menu.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useTheme } from '../theme/context';
import { useAuth } from '../auth/context';
import { api } from '../api/client';
import type { AvatarMenuItem } from '../types/api';
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

    const [menuItems, setMenuItems] = useState<AvatarMenuItem[] | null>(null);

    const openUrl = async (url: string) => {
        props.navigation.closeDrawer();
        await Linking.openURL(url);
    };

    const handleLogout = async () => {
        props.navigation.closeDrawer();
        await logout();
    };

    useEffect(() => {
        let didCancel = false;

        async function loadMenu() {
            try {
                const response = await api.getAvatarMenu();
                if (!didCancel) {
                    setMenuItems(response.items);
                }
            } catch {
                if (!didCancel) {
                    setMenuItems([]);
                }
            }
        }

        if (user) {
            loadMenu();
        } else {
            setMenuItems([]);
        }

        return () => {
            didCancel = true;
        };
    }, [user]);

    const extraDrawerItems = useMemo(() => {
        if (!menuItems) {
            return [];
        }

        const filtered = menuItems.filter((item) => {
            const id = item.id?.toLowerCase?.() ?? '';
            const label = item.label?.toLowerCase?.() ?? '';

            if (id === 'logout' || label.includes('log out') || label.includes('logout')) {
                return false;
            }

            if (id === 'view_profile' || label === 'view profile') {
                return false;
            }

            if (id === 'settings' || label === 'settings') {
                return false;
            }

            return Boolean(item.url && item.label);
        });

        return filtered.sort((a, b) => a.priority - b.priority);
    }, [menuItems]);

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
                        if (!user?.profile_url) return;
                        openUrl(user.profile_url);
                    }}
                />
                <DrawerItem
                    label="Settings"
                    onPress={() => openUrl('https://community.extrachill.com/settings/')}
                />

                {extraDrawerItems.map((item) => (
                    <DrawerItem
                        key={`${item.id}:${item.url}`}
                        label={item.label}
                        danger={item.danger}
                        onPress={() => openUrl(item.url)}
                    />
                ))}
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
