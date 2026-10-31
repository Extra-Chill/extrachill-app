import type { MemberCard, MembersPage } from './client';
export function memberId(value: unknown): number | null;
export function memberRoute(value: unknown, ownId?: number): string | null;
export function mergeMembers(current: MemberCard[], incoming: MemberCard[]): MemberCard[];
export function membersPage(value: { members?: MemberCard[]; pagination?: { total_pages: number } }, page: number, perPage: number): MembersPage;
