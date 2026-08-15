import type { Forum, Reply } from './types';

export function plainText(value: unknown): string;
export function plainTextToHtml(value: string): string;
export function displayDate(value: string): string;
export function forumRows(forums: Forum[]): Array<Forum & { depth: number }>;
export function mergeReplies(current: Reply[], incoming: Reply[]): Reply[];
export function communityError(error: unknown): {
    kind: 'permission' | 'not-found' | 'retry';
    message: string;
};
