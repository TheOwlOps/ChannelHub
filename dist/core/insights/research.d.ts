export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    content?: string;
}
export interface WebSearchOptions {
    /** Maximum number of results to return (default: 5, max: 10) */
    limit?: number;
    /** If true, fetches and extracts the full readable markdown content for top URLs via Jina Reader */
    deepExtract?: boolean;
    /** Search engine backend (defaults to "duckduckgo" with 0 API keys required) */
    provider?: "duckduckgo" | "tavily" | "brave";
    /** Optional API Key for Tavily or Brave */
    apiKey?: string;
    signal?: AbortSignal;
}
export interface PageExtractResult {
    url: string;
    title?: string;
    content: string;
}
/**
 * High-performance Web Research & Deep Extraction Engine for AI Agents.
 * Built with zero external runtime dependencies.
 */
export declare class WebResearch {
    /**
     * Search the web across DuckDuckGo, Tavily, or Brave.
     */
    static search(query: string, options?: WebSearchOptions): Promise<SearchResult[]>;
    /**
     * Deep content extractor: Fetches clean Markdown text from any web URL.
     * Uses Jina Reader with direct fetch fallback.
     */
    static extract(url: string, signal?: AbortSignal): Promise<PageExtractResult>;
    private static searchDuckDuckGo;
    private static searchTavily;
    private static searchBrave;
}
