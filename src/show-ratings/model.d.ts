import type { Show } from '../you/client';
export function canRateShow(timing: string | undefined, attended: boolean): boolean;
export function toggleRating(current: number, star: number): number;
export function recentShows(shows: Show[], ratings: Record<number, number>): Show[];
