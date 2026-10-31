import type { WPNativeClient } from 'wp-native-client';

export interface Notification {
    id: number;
    title: string;
    link: string;
    is_read: boolean | number | string;
    created_at: string;
    actor_id?: number;
    actor_display_name?: string;
    actor_profile_link?: string;
}
export interface NotificationPage {
    notifications: Notification[];
    total: number;
    unread_count: number;
    page: number;
    pages: number;
}
export function listNotifications(client: WPNativeClient, unread = false, page = 1) {
    return client.execute<NotificationPage>('extrachill/get-notifications', { unread, page, per_page: 20 });
}
export function getUnreadCount(client: WPNativeClient) {
    return client.execute<{ unread_count: number }>('extrachill/get-notification-unread-count', {});
}
export function markNotificationsRead(client: WPNativeClient, notificationId = 0) {
    return client.execute<{ marked: number }>('extrachill/mark-notifications-read', { notification_id: notificationId });
}
