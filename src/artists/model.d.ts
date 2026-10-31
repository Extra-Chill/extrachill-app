export function artistId(value: unknown): number | null;
export function linkPageUrl(slug: unknown): string;
export function manageArtistUrl(id: number): string;
export function linkPageLinks(data: unknown): { url: string; label: string }[];
export function analyticsSummary(data: unknown): { views: number | null; clicks: number | null; links: { label: string; clicks: number | null }[] };
