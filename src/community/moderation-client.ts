import type { WPNativeClient } from 'wp-native-client';
import { buildReportInput } from './moderation-model';
import type { ReportReason, ReportResult, ReportTarget } from './moderation-model';
export { REPORT_REASONS, buildReportInput, reportMessage } from './moderation-model';
export type { ReportReason, ReportResult, ReportTarget } from './moderation-model';

export const moderationAbilities = {
    report: 'extrachill/community-report-content',
    block: 'extrachill/community-block-user',
    unblock: 'extrachill/community-unblock-user',
    list: 'extrachill/community-list-blocked-users',
} as const;

export function moderationAvailable(client: WPNativeClient) {
    return {
        report: Boolean(client.describe(moderationAbilities.report)),
        block: Boolean(client.describe(moderationAbilities.block)),
        unblock: Boolean(client.describe(moderationAbilities.unblock)),
        list: Boolean(client.describe(moderationAbilities.list)),
    };
}

export function reportContent(client: WPNativeClient, target: ReportTarget, reason: ReportReason, note = '') {
    return client.execute<ReportResult>(moderationAbilities.report, buildReportInput(target, reason, note));
}
export interface BlockedMember { user_id: number; display_name: string; profile_url: string | null }
export interface BlockResult { user_id: number; blocked: boolean; total: number }
export function blockMember(client: WPNativeClient, userId: number) {
    return client.execute<BlockResult>(moderationAbilities.block, { user_id: userId });
}
export function unblockMember(client: WPNativeClient, userId: number) {
    return client.execute<BlockResult>(moderationAbilities.unblock, { user_id: userId });
}
export function listBlockedMembers(client: WPNativeClient) {
    return client.execute<{ users: BlockedMember[] }>(moderationAbilities.list, {});
}
