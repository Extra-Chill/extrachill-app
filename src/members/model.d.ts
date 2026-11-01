import type { MemberCard, MembersPage } from './client';
import type { Topic } from '../community/types';
export function actorDestination(actor: { user_id?: number; profile_url: string | null }): { kind: 'native'; path: `/members/${number}` } | { kind: 'browser'; url: string } | null;
export function supportsAuthorTopics(ability: unknown): boolean;
export interface MemberTopicsPage { topics: Topic[]; page: number; hasMore: boolean }
export function memberTopicsPage(current: Topic[], result: { topics: Topic[]; page: number; pages: number }): MemberTopicsPage;
export function memberId(value: unknown): number | null;
export function memberRoute(value: unknown, ownId?: number): string | null;
export function mergeMembers(current: MemberCard[], incoming: MemberCard[]): MemberCard[];
export function membersPage(value: { members?: MemberCard[]; pagination?: { total_pages: number } }, page: number, perPage: number): MembersPage;
