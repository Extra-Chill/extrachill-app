import type { StoryItem } from './client';
export function cleanExcerpt(value: string): string;
export function displayDate(value: string): string;
export function mergeStories(previous: StoryItem[], incoming: StoryItem[]): StoryItem[];
export function storyError(error: unknown): string;
export function readerDocument(content: string, colors: { background: string; text: string; primary: string }): string;
