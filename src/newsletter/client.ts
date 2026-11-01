import type { WPNativeClient } from 'wp-native-client';
import type { NewsletterList } from './model';

const GET = 'extrachill/newsletter-get-my-subscriptions';
const SET = 'extrachill/newsletter-set-my-subscription';

export const canManageNewsletter = (client: WPNativeClient) => Boolean(client.describe(GET) && client.describe(SET));
export const getSubscriptions = (client: WPNativeClient) => client.execute<{ lists: NewsletterList[] }>(GET, {});
export const setSubscription = (client: WPNativeClient, list: string, subscribed: boolean) =>
    client.execute<{ list: string; subscribed: boolean }>(SET, { list, subscribed });
