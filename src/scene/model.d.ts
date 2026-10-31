import type { CalendarEvent, DateGroup } from '../events/model';
export function trimChronological<T, K extends keyof T>(items: T[], dateKey: K, limit: number, newestFirst?: boolean): T[];
export function selectEvents(tonight: DateGroup[], weekend?: DateGroup[]): { title: string; events: CalendarEvent[] };
export function sectionState(loading: boolean, error: string, items: unknown[]): 'loading' | 'error' | 'empty' | 'ready';
