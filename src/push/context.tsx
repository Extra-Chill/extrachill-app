import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useAuth, useBrowserHandoff } from 'wp-native-shell';
import { createPushLifecycle, openPush, type PushLifecycle } from './model';

type Notifications = typeof import('expo-notifications');
const LogoutContext = createContext<(() => Promise<void>) | null>(null);
let loggedSkip = false;
function supported() {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const valid = Platform.OS !== 'web' && Device.isDevice && !!projectId && projectId !== '00000000-0000-0000-0000-000000000000';
    if (!valid && !loggedSkip) { console.info('Push disabled: requires a physical native device and a configured EAS projectId.'); loggedSkip = true; }
    return valid ? projectId : null;
}

export function PushProvider({ children }: { children: ReactNode }) {
    const { client, isAuthenticated, logout } = useAuth();
    const { handle } = useBrowserHandoff();
    const router = useRouter();
    const lifecycle = useRef<PushLifecycle | null>(null);
    const [prompt, setPrompt] = useState(false);
    const [notice, setNotice] = useState<{ title: string; data: unknown } | null>(null);
    const actions = useRef({ client, push: router.push, handoff: handle });
    actions.current = { client, push: router.push, handoff: handle };
    const permissionAction = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => {
        const projectId = supported();
        if (!isAuthenticated || Platform.OS === 'web') return;
        let active = true;
        const manager = createPushLifecycle(client);
        lifecycle.current = manager;
        const subscriptions: { remove(): void }[] = [];
        const notifications: Notifications = require('expo-notifications');
        const report = (error: unknown) => console.warn('Push operation failed', error);
        const open = (data: unknown) => void openPush(data, actions.current).catch(report);
        // The custom notice is the sole foreground presentation (no duplicate OS banner/sound).
        notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }) });
        async function register() {
            if (!projectId || !active) return;
            const token = await notifications.getExpoPushTokenAsync({ projectId });
            if (active) await manager.register(token.data);
        }
        permissionAction.current = async () => {
            setPrompt(false);
            await AsyncStorage.setItem('push-explained', 'yes');
            const permission = await notifications.requestPermissionsAsync();
            if (active && permission.granted) await register();
        };
        const seen = new Set<string>();
        const response = (value: import('expo-notifications').NotificationResponse) => {
            if (!active) return;
            const key = value.notification.request.identifier;
            if (seen.has(key)) return;
            seen.add(key);
            setNotice(null);
            open(value.notification.request.content.data);
            void notifications.clearLastNotificationResponseAsync().catch(report);
        };
        subscriptions.push(notifications.addNotificationResponseReceivedListener(response));
        subscriptions.push(notifications.addNotificationReceivedListener(value => {
            if (active) setNotice({ title: value.request.content.title || 'New notification', data: value.request.content.data });
        }));
        // Native token changes require obtaining a fresh Expo token, not sending the APNs/FCM token.
        subscriptions.push(notifications.addPushTokenListener(() => { void register().catch(report); }));
        void (async () => {
            if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('default', { name: 'Notifications', importance: notifications.AndroidImportance.DEFAULT });
            const last = await notifications.getLastNotificationResponseAsync();
            if (last) response(last);
            const permission = await notifications.getPermissionsAsync();
            if (!active) return;
            if (permission.granted) await register();
            else if (projectId && permission.canAskAgain && !(await AsyncStorage.getItem('push-explained')) && active) setPrompt(true);
        })().catch(report);
        return () => {
            active = false; manager.stop(); subscriptions.forEach(item => item.remove());
            permissionAction.current = null; lifecycle.current = null;
            setPrompt(false); setNotice(null);
        };
    }, [client, isAuthenticated]);

    async function signOut() {
        try { await lifecycle.current?.unregister(); }
        catch (error) { console.warn('Push unregister failed; continuing sign out', error); }
        await logout();
    }
    return <LogoutContext.Provider value={signOut}>
        {children}
        {prompt ? <View style={{ padding: 20, backgroundColor: '#fff', borderTopWidth: 1 }}>
            <Text style={{ color: '#111' }}>Stay in the conversation</Text>
            <Text style={{ color: '#111' }}>Enable push notifications for replies, mentions, and requested work. You can change this in Settings.</Text>
            <Pressable accessibilityRole="button" onPress={() => void permissionAction.current?.().catch(error => console.warn('Push permission failed', error))}><Text style={{ color: '#1255a0', padding: 12 }}>Continue</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setPrompt(false); void AsyncStorage.setItem('push-explained', 'yes').catch(() => {}); }}><Text style={{ color: '#1255a0', padding: 12 }}>Not now</Text></Pressable>
        </View> : null}
        {notice ? <View accessibilityRole="alert" style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1 }}>
            <Pressable accessibilityRole="button" onPress={() => { const data = notice.data; setNotice(null); void openPush(data, actions.current).catch(error => console.warn('Push tap failed', error)); }}><Text style={{ color: '#111' }}>{notice.title}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setNotice(null)}><Text style={{ color: '#1255a0', padding: 8 }}>Dismiss</Text></Pressable>
        </View> : null}
    </LogoutContext.Provider>;
}

export function usePushLogout() {
    const logout = useContext(LogoutContext);
    if (!logout) throw new Error('PushProvider is missing');
    return logout;
}
