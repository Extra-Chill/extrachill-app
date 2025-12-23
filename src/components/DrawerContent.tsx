/**
 * Drawer content menu.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { api } from '../api/client';
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
    const { user, logout, isAuthenticated } = useAuth();

    const siteUrls = user?.site_urls;

    const openUrl = async (url: string) => {
        props.navigation.closeDrawer();

        try {
            const { hostname } = Linking.parse(url);
            const host = hostname ? hostname.toLowerCase() : '';
            const isExtrachillCom = host === 'extrachill.com' || host.endsWith('.extrachill.com');
            const isExtrachillLink = host.includes('extrachill.link');

            if (isAuthenticated && isExtrachillCom && !isExtrachillLink) {
                const handoffUrl = await api.createBrowserHandoffUrl(url);
                await Linking.openURL(handoffUrl);
                return;
            }
        } catch {
            // Fall through to direct open.
        }

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
                        if (!user?.profile_url) return;
                        openUrl(user.profile_url);
                    }}
                />
                {siteUrls?.artist && user?.artist_ids && user.artist_ids.length > 0 ? (
                    <>
                        <DrawerItem
                            label={user.artist_ids.length === 1 ? 'Manage Artist' : 'Manage Artists'}
                            onPress={() => openUrl(`${siteUrls.artist}/manage-artist/`)}
                        />

                        {typeof user.link_page_count === 'number' ? (
                            <DrawerItem
                                label={user.link_page_count === 0
                                    ? 'Create Link Page'
                                    : user.link_page_count === 1
                                        ? 'Manage Link Page'
                                        : 'Manage Link Pages'}
                                onPress={() => openUrl(`${siteUrls.artist}/manage-link-page/`)}
                            />
                        ) : null}

                        {user.can_manage_shop ? (
                            <DrawerItem
                                label={user.shop_product_count && user.shop_product_count > 0
                                    ? 'Manage Shop'
                                    : 'Create Shop'}
                                onPress={() => openUrl(`${siteUrls.artist}/manage-shop/`)}
                            />
                        ) : null}
                    </>
                ) : siteUrls?.artist && user?.can_create_artists ? (
                    <DrawerItem
                        label="Create Artist Profile"
                        onPress={() => openUrl(`${siteUrls.artist}/create-artist/`)}
                    />
                ) : null}


                {siteUrls?.community ? (
                    <DrawerItem
                        label="Settings"
                        onPress={() => openUrl(`${siteUrls.community}/settings/`)}
                    />
                ) : null}
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
