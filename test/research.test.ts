import { test, expect, describe, mock, afterEach } from "bun:test";
import { WebResearch } from "../src/core/research";
import { getChannelHubMcpTools, handleChannelHubMcpCall } from "../src/bridges/mcp/index";
import { ChannelHub } from "../src/core/hub";

describe("WebResearch Engine", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("searches DuckDuckGo HTML and parses titles and snippets", async () => {
    const fakeHtml = `
      <div id="links">
        <div class="result results_links results_links_deep web-result">
          <h2 class="result__title">
            <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fowlops.dev%2Fagent">OwlOps AI Agent</a>
          </h2>
          <a class="result__snippet">Autonomous AI Agent operating across multiple channels.</a>
        </div>
      </div>
    `;

    globalThis.fetch = mock(async () => new Response(fakeHtml, { status: 200 })) as any;

    const results = await WebResearch.search("owlops");
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("OwlOps AI Agent");
    expect(results[0].url).toBe("https://owlops.dev/agent");
    expect(results[0].snippet).toBe("Autonomous AI Agent operating across multiple channels.");
  });

  test("extracts readable content using Jina Reader", async () => {
    globalThis.fetch = mock(async (url: any) => {
      expect(String(url)).toContain("https://r.jina.ai/");
      return new Response("# Article Content\n\nFull clean markdown body.", { status: 200 });
    }) as any;

    const res = await WebResearch.extract("https://example.com/blog/1");
    expect(res.url).toBe("https://example.com/blog/1");
    expect(res.content).toContain("# Article Content");
  });

  test("deepExtract attaches markdown content to top search results", async () => {
    const fakeHtml = `
      <div class="result results_links results_links_deep web-result">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Ftest.com">Test Title</a>
        <a class="result__snippet">Snippet info</a>
      </div>
    `;

    globalThis.fetch = mock(async (url: any) => {
      if (String(url).includes("duckduckgo")) {
        return new Response(fakeHtml, { status: 200 });
      }
      return new Response("# Deep Content from Jina", { status: 200 });
    }) as any;

    const results = await WebResearch.search("test", { deepExtract: true });
    expect(results.length).toBe(1);
    expect(results[0].content).toContain("# Deep Content from Jina");
  });

  test("MCP Registry exposes 34 total tools including search and extract", () => {
    const tools = getChannelHubMcpTools();
    expect(tools.length).toBe(34);
    const names = tools.map((t) => t.name);
    expect(names).toContain("channelhub_web_search");
    expect(names).toContain("channelhub_web_extract");
  });

  test("MCP tool channelhub_web_search dispatches correctly", async () => {
    const fakeHtml = `
      <div class="result results_links results_links_deep web-result">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Ftarget.com">MCP Search Result</a>
        <a class="result__snippet">Desc</a>
      </div>
    `;
    globalThis.fetch = mock(async () => new Response(fakeHtml, { status: 200 })) as any;

    const hub = new ChannelHub();
    const result = await handleChannelHubMcpCall(hub, "channelhub_web_search", { query: "channelhub" });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data[0].title).toBe("MCP Search Result");
  });
});
