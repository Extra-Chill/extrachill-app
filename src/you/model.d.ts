import type { Profile, Show } from './client';
export function safeLinks(links: unknown): Profile['links'];
export function mergeShows(current: Show[], incoming: Show[]): Show[];
export function deletionConfirmed(available: boolean, confirmation: string): boolean;
export function passwordError(current: string, password: string, confirm: string): string;
export function youError(error: unknown): string;
