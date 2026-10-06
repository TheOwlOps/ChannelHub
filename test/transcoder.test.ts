import { test, expect, describe } from "bun:test";
import { MediaTranscoder } from "../src/core/transcoder";
import { readFileSync, existsSync } from "node:fs";

describe("MediaTranscoder", () => {
  const realImagePath = "C:/Users/OS/AppData/Local/hermes/cache/images/img_5a3a21c17b5b.png";

  test("dynamically loads sharp", async () => {
    const sharp = await MediaTranscoder.getSharp();
    expect(sharp).toBeDefined();
  });

  test("transcodes real PNG image to WebP with size reduction", async () => {
    if (!existsSync(realImagePath)) {
      console.warn("Skipping real image test, file not found");
      return;
    }
    const inputBuf = readFileSync(realImagePath);
    const result = await MediaTranscoder.transcodeImage(inputBuf, {
      format: "webp",
      quality: 80,
      maxWidth: 1200,
    });

    expect(result.format).toBe("webp");
    expect(result.mimeType).toBe("image/webp");
    expect(result.originalSize).toBe(inputBuf.length);
    expect(result.transcodedSize).toBeLessThan(result.originalSize);
    expect(result.width).toBeLessThanOrEqual(1200);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  test("transcodes to JPEG with EXIF stripping and resize", async () => {
    if (!existsSync(realImagePath)) return;
    const inputBuf = readFileSync(realImagePath);
    const result = await MediaTranscoder.transcodeImage(inputBuf, {
      format: "jpeg",
      quality: 75,
      maxWidth: 800,
    });

    expect(result.format).toBe("jpeg");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.width).toBeLessThanOrEqual(800);
  });
});
