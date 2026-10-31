export type ReportReason = 'spam' | 'harassment' | 'hate' | 'sexual' | 'other';
export type ReportTarget = { post_id: number; user_id?: never } | { user_id: number; post_id?: never };
export interface ReportResult { report_id: number; status: 'open'; deduplicated: boolean }
export const REPORT_REASONS: ReadonlyArray<{ value: ReportReason; label: string }>;
export function buildReportInput(target: ReportTarget, reason: ReportReason, note?: string): ReportTarget & { reason: ReportReason; note?: string };
export function reportMessage(result?: ReportResult | null, error?: unknown): string;
