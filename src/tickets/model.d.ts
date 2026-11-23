export interface Pass { code: string; status: string; url?: string; showQR?: boolean }
export interface Order { reference: string; order_id: number; event_id: number; event_title: string; event_url: string; quantity: number; status: string; created_at: string; passes: Pass[] }
export interface OrdersPayload { orders: Order[] }
export interface Offer { enabled: boolean; sale_open: boolean; price_minor: number; currency: string; remaining: number | null; url: string; ticket_types?: { id: string | number; name: string; price_minor: number; remaining: number | null }[] }
export interface TicketCard { rows: { id: string; name: string; price: string; availability: string }[]; saleOpen: boolean; canBuy: boolean; url: string }
export function activePass(pass: { code?: string; status?: string } | null): boolean;
export function shapeOrders(payload: OrdersPayload): Order[];
export function money(minor: number, currency?: string): string;
export function offerCard(offer: Offer): TicketCard | null;
export function passURL(code: string): string;
export function qrMatrix(value: string): boolean[][];
export function matrixPath(matrix: boolean[][], quiet?: number): string;
export function cacheKey(userId: number | null): string | null;
export interface SavedOrders { userId: number; payload: OrdersPayload; updatedAt: string }
export interface TicketCache { setUser(id: number | null): Promise<void>; load(id: number): Promise<SavedOrders | null>; save(id: number, payload: OrdersPayload, updatedAt: string): Promise<void> }
export function createTicketCache(storage: { getAllKeys(): Promise<readonly string[]>; multiRemove(keys: string[]): Promise<void>; getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }): TicketCache;
