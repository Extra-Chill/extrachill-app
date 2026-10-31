/**
 * Drawer layout for authenticated app surfaces.
 *
 * Auth gating moved to WPNativeApp's AuthGate — this component
 * unconditionally renders the drawer. If the user isn't authenticated,
 * AuthGate intercepts before this layout even mounts.
 *
 * Uses a config-driven consumer drawer to add Inbox unread badges.
 * The Inbox provider shares one count across drawer, Home and Inbox.
 */

import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { InboxDrawerContent } from '../../src/inbox/DrawerContent';
import { InboxProvider } from '../../src/inbox/context';

export default function DrawerLayout() {
    return (
        <InboxProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
                drawerContent={(props) => <InboxDrawerContent {...props} />}
                screenOptions={{ headerShown: false, drawerType: 'front' }}
            />
        </GestureHandlerRootView>
        </InboxProvider>
    );
}
