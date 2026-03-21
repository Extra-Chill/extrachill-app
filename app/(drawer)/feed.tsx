/**
 * Home screen.
 *
 * Placeholder for section-based navigation. The app will evolve to present
 * per-section views (events, community, blog, etc.) rather than a unified
 * activity feed.
 */

import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { ParamListBase } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { useAuth } from '../../src/auth/context';
import { useTheme } from '../../src/theme/context';
import { Avatar } from '../../src/components';

export default function Feed() {
    const navigation = useNavigation<DrawerNavigationProp<ParamListBase>>();
    const { user } = useAuth();
    const { colors, spacing, fontSize, fontFamily } = useTheme();

    const openDrawer = () => {
        navigation.openDrawer();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundColor }]} edges={['top']}>
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: colors.headerBackground,
                        paddingHorizontal: spacing.spacingMd,
                        paddingVertical: spacing.spacingSm,
                    },
                ]}
            >
                <View style={styles.headerLeft}>
                    <Avatar url={user?.avatar_url} size={34} onPress={openDrawer} />
                </View>

                <View style={styles.headerCenter}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.headerRight} />
            </View>

            <View style={[styles.content, { padding: spacing.spacingXl }]}>
                <Text
                    style={{
                        color: colors.mutedText,
                        fontSize: fontSize.fontSizeBase,
                        fontFamily: fontFamily.body,
                        textAlign: 'center',
                    }}
                >
                    Welcome to Extra Chill
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
    },
    headerLeft: {
        width: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        width: 44,
    },
    logo: {
        height: 34,
        width: 120,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
