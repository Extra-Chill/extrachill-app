import type { WPNativeClient } from 'wp-native-client';
import type { Href } from 'expo-router';
export interface PushLifecycle { register(token: string): Promise<unknown>; stop(): void; unregister(): Promise<unknown> }
export function createPushLifecycle(client: WPNativeClient): PushLifecycle;
export function openPush(data: unknown, dependencies: { client: WPNativeClient; push: (path: Href) => void; handoff: (url: string) => Promise<unknown> }): Promise<void>;
