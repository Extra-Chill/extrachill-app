import type { WPNativeClient } from 'wp-native-client';
import { getProfile, type Profile } from '../you/client';
import { membersPage } from './model';
export interface MemberCard { user_id: number; display_name: string; avatar_url?: string; custom_title?: string; local_city?: string }
export type MemberProfile = Profile;
export interface MembersPage { members: MemberCard[]; page: number; hasMore: boolean }
export const getMemberProfile = getProfile;
export const PAGE_SIZE = 25;
export async function listSceneMembers(client: WPNativeClient, slug: string, page = 1): Promise<MembersPage> {
    const result = await client.execute<{ members?: MemberCard[]; pagination?: { total_pages: number } }>('extrachill/local-scene-members', { slug, page, per_page: PAGE_SIZE });
    return membersPage(result, page, PAGE_SIZE);
}
