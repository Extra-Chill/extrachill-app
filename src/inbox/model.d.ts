import type { Notification } from './client';
export function notificationRoute(link: string): `/community/topic/${string}` | `/calendar/event/${string}` | `/stories/${string}` | null;
export function isUnread(notification: Pick<Notification, 'is_read'>): boolean;
export function mergeNotifications(previous: Notification[], incoming: Notification[]): Notification[];
export function shouldRefreshCount(lastFetch: number | null, now: number): boolean;
