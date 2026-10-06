export type AspectRatioMode = "blur-backdrop" | "crop-center" | "fit-pad";
export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
export interface SubtitleStyle {
    fontSize?: number;
    fontColor?: string;
    bold?: boolean;
    alignment?: 2 | 6 | 10;
}
export interface VideoShortsOptions {
    input: string;
    output: string;
    mode?: AspectRatioMode;
    targetWidth?: number;
    targetHeight?: number;
    ffmpegPath?: string;
}
export interface SubtitleBurnOptions {
    input: string;
    output: string;
    subtitles: string;
    style?: SubtitleStyle;
    ffmpegPath?: string;
}
export interface WatermarkOptions {
    input: string;
    watermark: string;
    output: string;
    position?: WatermarkPosition;
    opacity?: number;
    scale?: number;
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
    fps?: number;
    width?: number;
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
export declare class VideoEngine {
    /**
     * Convert landscape (16:9) or arbitrary video into TikTok/Shorts/Reels (9:16 vertical)
     * with professional blurred background backdrop, crop, or padding.
     */
    static createShort(options: VideoShortsOptions): Promise<{
        output: string;
        command: string[];
    }>;
    /**
     * Burns subtitles (SRT/VTT) into video with customizable style.
     */
    static burnSubtitles(options: SubtitleBurnOptions): Promise<{
        output: string;
        command: string[];
    }>;
    /**
     * Adds an image watermark/logo with customizable position, scale, and opacity.
     */
    static addWatermark(options: WatermarkOptions): Promise<{
        output: string;
        command: string[];
    }>;
    /**
     * Fast extraction of a clean JPEG thumbnail or keyframe.
     */
    static extractThumbnail(options: ThumbnailOptions): Promise<{
        output: string;
        command: string[];
    }>;
    /**
     * Converts a video segment into a compressed high-quality animated GIF with optional meme caption text.
     */
    static generateMemeGif(options: MemeGifOptions): Promise<{
        output: string;
        command: string[];
    }>;
    /**
     * Cloud Video Timeline Rendering via Shotstack REST API.
     * Renders multi-layer timelines, transitions, HTML animated titles, and audio mixing in the cloud.
     */
    static renderShotstack(options: ShotstackRenderOptions): Promise<{
        renderId: string;
        status: string;
        url?: string;
    }>;
    /**
     * Helper to spawn child process and capture exit code / error stream.
     */
    private static runProcess;
}
