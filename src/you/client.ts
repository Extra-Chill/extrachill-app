import type { WPNativeClient } from 'wp-native-client';
import { deletionConfirmed } from './model';

export interface ProfileFields { custom_title: string; bio: string; local_city: string }
export interface Profile extends ProfileFields {
    user_id: number; display_name: string; avatar_url: string;
    links: { url: string; custom_label?: string; type_key?: string }[];
}
export interface NameFields { first_name: string; last_name: string; display_name: string }
export interface Settings extends NameFields { email: string; pending_email: string | null }
export interface Preferences { emails_enabled: boolean; auto_subscribe_replies: boolean }
export interface Show { event_id: number; title: string; event_date: string; venue?: { name: string } | null }
export interface ShowsPage { shows: Show[]; total: number; pages: number; page: number }
export type Period = 'upcoming' | 'past';
export const getProfile = (client: WPNativeClient, userId: number) => client.execute<Profile>('extrachill/get-user-profile', { user_id: userId });
export const updateProfile = (client: WPNativeClient, fields: ProfileFields) => client.execute('extrachill/update-user-profile', fields);
export const getSettings = (client: WPNativeClient) => client.execute<Settings>('extrachill/get-user-settings', {});
export const updateSettings = (client: WPNativeClient, fields: NameFields) => client.execute('extrachill/update-user-settings', fields);
export const getPreferences = (client: WPNativeClient) => client.execute<Preferences>('extrachill/get-notification-preferences', {});
export const updatePreferences = (client: WPNativeClient, enabled: boolean) => client.execute('extrachill/update-notification-preferences', { emails_enabled: enabled });
export const getShows = (client: WPNativeClient, period: Period, page = 1) => client.execute<ShowsPage>('extrachill/get-user-shows', { period, page, per_page: 20 });
export const changeEmail = (client: WPNativeClient, email: string) => client.execute('extrachill/change-user-email', { new_email: email.trim() });
export const changePassword = (client: WPNativeClient, current: string, password: string, confirm: string) => client.execute('extrachill/change-user-password', { current_password: current, new_password: password, confirm_password: confirm });
export const canDeleteAccount = (client: WPNativeClient) => Boolean(client.describe('extrachill/delete-my-account'));
export function deleteAccount(client: WPNativeClient, confirmation: string) {
    if (!deletionConfirmed(canDeleteAccount(client), confirmation)) throw new Error('Account deletion is unavailable or not confirmed.');
    return client.execute('extrachill/delete-my-account', {});
}
