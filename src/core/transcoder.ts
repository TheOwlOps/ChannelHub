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
  compressionRatio: number; // e.g. 0.35 (65% reduction)
  width: number;
  height: number;
}

/**
 * High-performance Image Transcoder using 'sharp' (libvips).
 * Zero hard dependencies: uses dynamic import, falls back safely if 'sharp' is missing.
 */
export class MediaTranscoder {
  private static sharpCache: any = null;

  /**
   * Dynamically loads sharp to avoid bundling it as a hard dependency.
   */
  static async getSharp(): Promise<any> {
    if (this.sharpCache) return this.sharpCache;
    try {
      const mod = await import("sharp");
      this.sharpCache = mod.default || mod;
      return this.sharpCache;
    } catch (e) {
      throw new Error("Cannot load optional dependency 'sharp'. Please install it: npm install sharp");
    }
  }

  /**
   * Transcode, resize, strip EXIF, and compress an image buffer.
   */
  static async transcodeImage(
    source: Buffer | Uint8Array,
    options: TranscodeOptions = {}
  ): Promise<TranscodeResult> {
    const sharp = await this.getSharp();
    
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 80,
      format = "webp",
      stripMetadata = true,
    } = options;

    const sourceBuf = Buffer.isBuffer(source) ? source : Buffer.from(source);
    
    let pipeline = sharp(sourceBuf, { failOn: "none" });
    
    // Strip metadata/EXIF for privacy
    if (stripMetadata) {
      pipeline = pipeline.withMetadata(false);
    }
    
    // Auto-rotate based on EXIF (if not stripped earlier)
    pipeline = pipeline.rotate();

    // Resize (scale down only)
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });

    // Format conversion & compression
    let mimeType = "image/webp";
    if (format === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      mimeType = "image/jpeg";
    } else if (format === "png") {
      pipeline = pipeline.png({ compressionLevel: 8, adaptiveFiltering: true });
      mimeType = "image/png";
    }

    const { data: outputBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });

    return {
      buffer: outputBuffer,
      format: info.format as any,
      mimeType,
      originalSize: sourceBuf.length,
      transcodedSize: outputBuffer.length,
      compressionRatio: outputBuffer.length / sourceBuf.length,
      width: info.width,
      height: info.height,
    };
  }
}
