import type { WPNativeClient } from 'wp-native-client';
import type { Offer, OrdersPayload } from './model';
export const SHOP_REST_ROOT = 'https://shop.extrachill.com/wp-json/';
export const listMyTickets = (client: WPNativeClient) => client.execute<OrdersPayload>('extrachill/list-my-ticket-orders', {});
export const getTicketOffer = (client: WPNativeClient, event: number) => client.execute<Offer>('extrachill/get-event-ticket-offer', { event });
export const getMyPass = (client: WPNativeClient, event_id: number) => client.execute<{ issued: boolean; code: string; status: string; perk_text: string }>('extrachill/get-my-event-pass', { event_id });
