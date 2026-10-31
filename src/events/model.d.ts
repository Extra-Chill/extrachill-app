export type TimeScope = 'tonight' | 'this-weekend' | 'this-week' | 'upcoming';
export interface EventLocation { term_id: number; name: string; slug: string; }
export interface CalendarEvent {
    id: number;
    title: string;
    datetime: string;
    end_datetime: string | null;
    permalink: string;
    venue: { name: string; timezone: string | null; formatted_address?: string } | null;
    performer: { name: string } | null;
    ticket_url: string | null;
    occurrence_display?: { formatted_time_display: string };
}
export interface DateGroup { date: string; label: string; events: CalendarEvent[]; }
export const scopes: { label: string; value: TimeScope }[];
export function mergeDates(current: DateGroup[], incoming: DateGroup[]): DateGroup[];
export function eventTime(event: CalendarEvent): string;
export function validEventId(value: unknown): boolean;
export function safeLink(value: unknown): string | null;
