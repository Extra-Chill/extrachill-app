export interface NewsletterList { key: string; name: string; subscribed: boolean }
export interface SubscriptionState { subscribed: boolean; previous: boolean; pending: boolean; error: string }
export type SubscriptionAction =
    | { type: 'toggle'; subscribed: boolean }
    | { type: 'saved'; subscribed: boolean }
    | { type: 'failed'; error: string };
export function subscriptionState(subscribed: boolean): SubscriptionState;
export function subscriptionReducer(state: SubscriptionState, action: SubscriptionAction): SubscriptionState;
