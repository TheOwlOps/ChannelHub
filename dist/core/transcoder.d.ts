export interface TranscodeOptions {
    /** Maximum width in pixels (aspect ratio preserved). Default: 1920 */
    maxWidth?: number;
    /** Maximum height in pixels (aspect ratio preserved). Default: 1920 */
    maxHeight?: number;
    /** Compression quality (1-100). Default: 80 */
    quality?: number;
    /** Target output format. Default: "webp" */
    format?: "webp" | "jpeg" | "png";
    /** Strip EXIF and camera metadata (removes GPS/device info). Default: true */
    stripMetadata?: boolean;
}
export interface TranscodeResult {
    buffer: Buffer;
    format: "webp" | "jpeg" | "png";
    mimeType: string;
    originalSize: number;
    transcodedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
}
/**
 * High-performance Image Transcoder using 'sharp' (libvips).
 * Zero hard dependencies: uses dynamic import, falls back safely if 'sharp' is missing.
 */
export declare class MediaTranscoder {
    private static sharpCache;
    /**
     * Dynamically loads sharp to avoid bundling it as a hard dependency.
     */
    static getSharp(): Promise<any>;
    /**
     * Transcode, resize, strip EXIF, and compress an image buffer.
     */
    static transcodeImage(source: Buffer | Uint8Array, options?: TranscodeOptions): Promise<TranscodeResult>;
}
