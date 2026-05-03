/**
 * Drawer layout for authenticated app surfaces.
 *
 * Auth gating moved to WPNativeApp's AuthGate — this component
 * unconditionally renders the drawer. If the user isn't authenticated,
 * AuthGate intercepts before this layout even mounts.
 *
 * Uses wp-native-shell's DrawerContent for the drawer menu items.
 * EC's custom DrawerContent (src/components/DrawerContent.tsx) is
 * kept alive for now but no longer mounted — M7.2.9 deletes it.
 */

import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DrawerContent } from 'wp-native-shell';

export default function DrawerLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
                drawerContent={(props) => <DrawerContent {...props} />}
                screenOptions={{ headerShown: false, drawerType: 'front' }}
            />
        </GestureHandlerRootView>
    );
}
