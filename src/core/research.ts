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
export class WebResearch {
  /**
   * Search the web across DuckDuckGo, Tavily, or Brave.
   */
  static async search(query: string, options: WebSearchOptions = {}): Promise<SearchResult[]> {
    const { limit = 5, provider = "duckduckgo", apiKey, deepExtract = false, signal } = options;

    let results: SearchResult[] = [];

    if (provider === "tavily") {
      results = await this.searchTavily(query, apiKey, limit, signal);
    } else if (provider === "brave") {
      results = await this.searchBrave(query, apiKey, limit, signal);
    } else {
      results = await this.searchDuckDuckGo(query, limit, signal);
    }

    if (deepExtract && results.length > 0) {
      // Extract top 3 results concurrently
      const topToExtract = results.slice(0, 3);
      await Promise.allSettled(
        topToExtract.map(async (r) => {
          try {
            const page = await this.extract(r.url, signal);
            r.content = page.content.slice(0, 5000); // Truncate at 5k chars per page for agent context limits
          } catch {
            // Silently ignore extraction errors
          }
        })
      );
    }

    return results;
  }

  /**
   * Deep content extractor: Fetches clean Markdown text from any web URL.
   * Uses Jina Reader with direct fetch fallback.
   */
  static async extract(url: string, signal?: AbortSignal): Promise<PageExtractResult> {
    try {
      // 1. Try Jina Reader first (fast markdown extraction + JS rendered)
      const res = await fetch(`https://r.jina.ai/${encodeURI(url)}`, {
        headers: {
          Accept: "text/plain",
          "User-Agent": "ChannelHub-Agent/1.0",
        },
        signal,
      });

      if (res.ok) {
        const text = await res.text();
        return {
          url,
          content: text.trim(),
        };
      }
    } catch {
      // Fallback to direct raw HTML fetch
    }

    // 2. Direct fallback
    const rawRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal,
    });
    const html = await rawRes.text();
    // Strip scripts, styles, and tags
    const clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      url,
      content: clean.slice(0, 10000),
    };
  }

  // --- Private Search Providers ---

  private static async searchDuckDuckGo(
    query: string,
    limit: number,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      signal,
    });

    if (!res.ok) throw new Error(`DuckDuckGo returned ${res.status}`);
    const html = await res.text();

    const results: SearchResult[] = [];
    const blockRegex = /<div class="result results_links results_links_deep web-result[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = blockRegex.exec(html)) !== null && results.length < limit) {
      const block = match[0];
      const titleMatch = block.match(/<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/);

      if (titleMatch) {
        let rawUrl = titleMatch[1];
        if (rawUrl.includes("uddg=")) {
          const extracted = rawUrl.split("uddg=")[1]?.split("&")[0];
          if (extracted) rawUrl = decodeURIComponent(extracted);
        }

        const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        if (rawUrl.startsWith("http")) {
          results.push({
            title,
            url: rawUrl,
            snippet,
          });
        }
      }
    }

    return results;
  }

  private static async searchTavily(
    query: string,
    apiKey?: string,
    limit: number = 5,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    if (!apiKey) throw new Error("Tavily provider requires apiKey in options");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: limit,
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
    const data = await res.json() as any;
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
  }

  private static async searchBrave(
    query: string,
    apiKey?: string,
    limit: number = 5,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    if (!apiKey) throw new Error("Brave provider requires apiKey in options");
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal,
    });
    if (!res.ok) throw new Error(`Brave search error: ${res.status}`);
    const data = await res.json() as any;
    return (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  }
}
