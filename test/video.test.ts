import { test, expect, describe, mock, afterEach } from "bun:test";
import { VideoEngine } from "../src/core/video";
import { getChannelHubMcpTools, handleChannelHubMcpCall } from "../src/bridges/mcp/index";
import { ChannelHub } from "../src/core/hub";

describe("VideoEngine & AI Shorts Generator", () => {
  test("generates FFmpeg args for TikTok/Shorts vertical video with blurred backdrop", async () => {
    // Mock runProcess by spying on private method through command extraction
    const originalRun = (VideoEngine as any).runProcess;
    let interceptedArgs: string[] = [];
    (VideoEngine as any).runProcess = async (_cmd: string, args: string[]) => {
      interceptedArgs = args;
    };

    try {
      const res = await VideoEngine.createShort({
        input: "input.mp4",
        output: "output_shorts.mp4",
        mode: "blur-backdrop",
      });

      expect(res.output).toBe("output_shorts.mp4");
      expect(interceptedArgs).toContain("-filter_complex");
      expect(interceptedArgs.join(" ")).toContain("boxblur=20:5[bg]");
      expect(interceptedArgs.join(" ")).toContain("overlay=(W-w)/2:(H-h)/2[outv]");
    } finally {
      (VideoEngine as any).runProcess = originalRun;
    }
  });

  test("generates FFmpeg args for subtitle burning with custom styles", async () => {
    const originalRun = (VideoEngine as any).runProcess;
    let interceptedArgs: string[] = [];
    (VideoEngine as any).runProcess = async (_cmd: string, args: string[]) => {
      interceptedArgs = args;
    };

    try {
      const res = await VideoEngine.burnSubtitles({
        input: "video.mp4",
        output: "subbed.mp4",
        subtitles: "1\n00:00:01,000 --> 00:00:04,000\nHello World",
        style: { fontSize: 32, bold: true },
      });

      expect(res.output).toBe("subbed.mp4");
      expect(interceptedArgs).toContain("-vf");
      expect(interceptedArgs.join(" ")).toContain("FontSize=32");
      expect(interceptedArgs.join(" ")).toContain("Bold=1");
    } finally {
      (VideoEngine as any).runProcess = originalRun;
    }
  });

  test("generates FFmpeg args for dynamic watermark with opacity & scaling", async () => {
    const originalRun = (VideoEngine as any).runProcess;
    let interceptedArgs: string[] = [];
    (VideoEngine as any).runProcess = async (_cmd: string, args: string[]) => {
      interceptedArgs = args;
    };

    try {
      const res = await VideoEngine.addWatermark({
        input: "clip.mp4",
        watermark: "logo.png",
        output: "watermarked.mp4",
        position: "top-right",
        opacity: 0.85,
        scale: 0.2,
      });

      expect(res.output).toBe("watermarked.mp4");
      expect(interceptedArgs.join(" ")).toContain("colorchannelmixer=aa=0.85");
      expect(interceptedArgs.join(" ")).toContain("overlay=W-w-20:20");
    } finally {
      (VideoEngine as any).runProcess = originalRun;
    }
  });

  test("renders timeline via Shotstack REST API", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({
        response: {
          id: "shotstack_render_123",
          status: "queued",
          url: "https://shotstack.io/output/123.mp4",
        },
      }), { status: 200 });
    }) as any;

    try {
      const res = await VideoEngine.renderShotstack({
        apiKey: "fake_shotstack_key",
        timeline: {
          tracks: [
            {
              clips: [
                {
                  asset: { type: "title", text: "AI Agent Video" },
                  start: 0,
                  length: 5,
                },
              ],
            },
          ],
        },
      });

      expect(res.renderId).toBe("shotstack_render_123");
      expect(res.status).toBe("queued");
      expect(res.url).toBe("https://shotstack.io/output/123.mp4");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("MCP Registry exposes 19 total MCP tools including video editing tools", () => {
    const tools = getChannelHubMcpTools();
    expect(tools.length).toBe(19);
    const names = tools.map((t) => t.name);
    expect(names).toContain("channelhub_video_create_short");
    expect(names).toContain("channelhub_video_burn_subtitles");
    expect(names).toContain("channelhub_video_add_watermark");
  });

  test("MCP tool channelhub_video_create_short executes handler", async () => {
    const originalRun = (VideoEngine as any).runProcess;
    (VideoEngine as any).runProcess = async () => {};

    try {
      const hub = new ChannelHub();
      const res = await handleChannelHubMcpCall(hub, "channelhub_video_create_short", {
        input: "source.mp4",
        output: "target_916.mp4",
        mode: "blur-backdrop",
      });

      expect(res.isError).toBeUndefined();
      const parsed = JSON.parse(res.content[0].text);
      expect(parsed.output).toBe("target_916.mp4");
    } finally {
      (VideoEngine as any).runProcess = originalRun;
    }
  });
});
