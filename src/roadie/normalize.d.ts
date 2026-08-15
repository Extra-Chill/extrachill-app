import type { DisplayMessage, PendingAction } from './types';

export function textFromContent(content: unknown): string;
export function normalizeMessages(messages: unknown): DisplayMessage[];
export function findPendingActions(value: unknown): PendingAction[];
export function isTerminalRunStatus(status: string): boolean;
export function pendingPreviewText(preview: unknown): string;
