export interface SearchResult {
    ID: number;
    post_title: string;
    post_excerpt?: string;
    post_type: string;
    site_name?: string;
    site_url?: string;
    permalink?: string;
}

export type SearchResponse = SearchResult[] | { results: SearchResult[]; total: number };
