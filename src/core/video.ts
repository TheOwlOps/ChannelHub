import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export type AspectRatioMode = "blur-backdrop" | "crop-center" | "fit-pad";
export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export interface SubtitleStyle {
  fontSize?: number;
  fontColor?: string; // e.g. "&H00FFFFFF" (ASS hex) or "white"
  bold?: boolean;
  alignment?: 2 | 6 | 10; // Bottom-center (2), Top-center (6)
}

export interface VideoShortsOptions {
  input: string;
  output: string;
  mode?: AspectRatioMode;
  targetWidth?: number;  // Default: 1080
  targetHeight?: number; // Default: 1920
  ffmpegPath?: string;
}

export interface SubtitleBurnOptions {
  input: string;
  output: string;
  subtitles: string; // SRT or VTT content or file path
  style?: SubtitleStyle;
  ffmpegPath?: string;
}

export interface WatermarkOptions {
  input: string;
  watermark: string; // Path to image/logo
  output: string;
  position?: WatermarkPosition;
  opacity?: number; // 0.1 to 1.0
  scale?: number; // percentage of video width, default 0.15 (15%)
  ffmpegPath?: string;
}

export interface ThumbnailOptions {
  input: string;
  output: string;
  timestampSec?: number;
  width?: number;
  ffmpegPath?: string;
}

export interface MemeGifOptions {
  input: string;
  output: string;
  startSec?: number;
  durationSec?: number;
  fps?: number; // default 15
  width?: number; // default 480
  topText?: string;
  bottomText?: string;
  ffmpegPath?: string;
}

export interface ShotstackClip {
  asset: {
    type: "video" | "image" | "audio" | "title" | "html";
    src?: string;
    text?: string;
    style?: string;
  };
  start: number;
  length: number;
  fit?: "cover" | "contain" | "crop";
  transition?: {
    in?: "fade" | "wipeLeft" | "wipeRight" | "slideLeft" | "slideRight";
    out?: "fade" | "wipeLeft" | "wipeRight";
  };
}

export interface ShotstackTimeline {
  tracks: Array<{
    clips: ShotstackClip[];
  }>;
  background?: string;
}

export interface ShotstackRenderOptions {
  timeline: ShotstackTimeline;
  apiKey: string;
  env?: "stage" | "v1";
  outputFormat?: "mp4" | "gif";
  aspectRatio?: "16:9" | "9:16" | "1:1";
  signal?: AbortSignal;
}

/**
 * Enterprise Video Editing & AI Shorts Engine for Autonomous Agents.
 * Supports ultra-fast native FFmpeg processing + Shotstack Cloud Rendering with 0 hard dependencies.
 */
export class VideoEngine {
  /**
   * Convert landscape (16:9) or arbitrary video into TikTok/Shorts/Reels (9:16 vertical)
   * with professional blurred background backdrop, crop, or padding.
   */
  static async createShort(options: VideoShortsOptions): Promise<{ output: string; command: string[] }> {
    const {
      input,
      output,
      mode = "blur-backdrop",
      targetWidth = 1080,
      targetHeight = 1920,
      ffmpegPath = "ffmpeg",
    } = options;

    let filterGraph = "";

    if (mode === "blur-backdrop") {
      // Split stream: 1 blurred background filling 9:16, 1 foreground centered
      filterGraph = [
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=20:5[bg]`,
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg]`,
        `[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]`,
      ].join(";");
    } else if (mode === "crop-center") {
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}[outv]`;
    } else {
      // fit-pad with black bars
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black[outv]`;
    }

    const args = [
      "-y",
      "-i", input,
      "-filter_complex", filterGraph,
      "-map", "[outv]",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "22",
      "-c:a", "aac",
      "-b:a", "128k",
      output,
    ];

    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }

  /**
   * Burns subtitles (SRT/VTT) into video with customizable style.
   */
  static async burnSubtitles(options: SubtitleBurnOptions): Promise<{ output: string; command: string[] }> {
    const { input, output, subtitles, style = {}, ffmpegPath = "ffmpeg" } = options;

    let srtPath = subtitles;
    let tempCreated = false;

    // If raw subtitle text is passed, write to a temp file
    if (!subtitles.endsWith(".srt") && !subtitles.endsWith(".vtt")) {
      srtPath = join(tmpdir(), `sub_${Date.now()}_${Math.random().toString(36).slice(2)}.srt`);
      await fs.writeFile(srtPath, subtitles, "utf8");
      tempCreated = true;
    }

    try {
      const fontSize = style.fontSize || 24;
      const fontColor = style.fontColor || "&H00FFFFFF";
      const bold = style.bold ? 1 : 0;
      // Windows requires escaping colons and backslashes in subtitles filter
      const safeSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
      const filter = `subtitles='${safeSrtPath}':force_style='FontSize=${fontSize},PrimaryColour=${fontColor},Bold=${bold}'`;

      const args = [
        "-y",
        "-i", input,
        "-vf", filter,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-c:a", "copy",
        output,
      ];

      await this.runProcess(ffmpegPath, args);
      return { output, command: [ffmpegPath, ...args] };
    } finally {
      if (tempCreated) {
        await fs.unlink(srtPath).catch(() => {});
      }
    }
  }

  /**
   * Adds an image watermark/logo with customizable position, scale, and opacity.
   */
  static async addWatermark(options: WatermarkOptions): Promise<{ output: string; command: string[] }> {
    const {
      input,
      watermark,
      output,
      position = "top-right",
      opacity = 0.9,
      scale = 0.15,
      ffmpegPath = "ffmpeg",
    } = options;

    let posExpr = "W-w-20:20"; // top-right default
    if (position === "top-left") posExpr = "20:20";
    else if (position === "bottom-left") posExpr = "20:H-h-20";
    else if (position === "bottom-right") posExpr = "W-w-20:H-h-20";
    else if (position === "center") posExpr = "(W-w)/2:(H-h)/2";

    // Filter: scale watermark relative to main video width, set opacity, then overlay
    const filterGraph = [
      `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
      `[0:v][wm]overlay=${posExpr}[outv]`,
    ].join(";");

    const args = [
      "-y",
      "-i", input,
      "-i", watermark,
      "-filter_complex", filterGraph,
      "-map", "[outv]",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-c:a", "copy",
      output,
    ];

    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }

  /**
   * Fast extraction of a clean JPEG thumbnail or keyframe.
   */
  static async extractThumbnail(options: ThumbnailOptions): Promise<{ output: string; command: string[] }> {
    const { input, output, timestampSec = 1.0, width, ffmpegPath = "ffmpeg" } = options;

    const args = [
      "-y",
      "-ss", String(timestampSec),
      "-i", input,
      "-vframes", "1",
    ];

    if (width) {
      args.push("-vf", `scale=${width}:-1`);
    }

    args.push(output);

    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }

  /**
   * Converts a video segment into a compressed high-quality animated GIF with optional meme caption text.
   */
  static async generateMemeGif(options: MemeGifOptions): Promise<{ output: string; command: string[] }> {
    const {
      input,
      output,
      startSec = 0,
      durationSec = 5,
      fps = 15,
      width = 480,
      topText,
      bottomText,
      ffmpegPath = "ffmpeg",
    } = options;

    const filterParts: string[] = [
      `fps=${fps}`,
      `scale=${width}:-1:flags=lanczos`,
    ];

    if (topText) {
      filterParts.push(
        `drawtext=text='${topText.replace(/'/g, "")}':x=(w-text_w)/2:y=20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`
      );
    }
    if (bottomText) {
      filterParts.push(
        `drawtext=text='${bottomText.replace(/'/g, "")}':x=(w-text_w)/2:y=h-text_h-20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`
      );
    }

    // Palettegen & paletteuse for crystal-clear GIF quality
    const vf = `${filterParts.join(",")},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;

    const args = [
      "-y",
      "-ss", String(startSec),
      "-t", String(durationSec),
      "-i", input,
      "-vf", vf,
      output,
    ];

    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }

  /**
   * Cloud Video Timeline Rendering via Shotstack REST API.
   * Renders multi-layer timelines, transitions, HTML animated titles, and audio mixing in the cloud.
   */
  static async renderShotstack(options: ShotstackRenderOptions): Promise<{ renderId: string; status: string; url?: string }> {
    const {
      timeline,
      apiKey,
      env = "stage",
      outputFormat = "mp4",
      aspectRatio = "9:16",
      signal,
    } = options;

    const baseUrl = env === "v1" ? "https://api.shotstack.io/edit/v1" : "https://api.shotstack.io/edit/stage";

    const payload = {
      timeline,
      output: {
        format: outputFormat,
        aspectRatio,
        fps: 30,
      },
    };

    const res = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shotstack render error (${res.status}): ${errText}`);
    }

    const data = await res.json() as any;
    return {
      renderId: data.response?.id,
      status: data.response?.status || "queued",
      url: data.response?.url,
    };
  }

  /**
   * Helper to spawn child process and capture exit code / error stream.
   */
  private static runProcess(cmd: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (err) => {
        reject(new Error(`Failed to execute ${cmd}: ${err.message}`));
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${cmd} exited with code ${code}. Details:\n${stderr.slice(-500)}`));
        }
      });
    });
  }
}
