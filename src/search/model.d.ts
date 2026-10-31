import type { SearchResponse, SearchResult } from './types';
export function normalizeQuery(value: string): string;
export function searchResults(response: SearchResponse): SearchResult[];
export function groupResults(results: SearchResult[]): { key: string; title: string; results: SearchResult[] }[];
export function resultDestination(result: SearchResult):
    | { kind: 'native'; path: `/community/topic/${number}` | `/calendar/event/${number}` }
    | { kind: 'browser'; url: string }
    | { kind: 'unavailable' };
export function rememberQuery(recent: string[], query: string): string[];
