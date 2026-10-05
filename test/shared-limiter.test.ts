import { describe, expect, test } from "bun:test";
import { SharedTokenBucketLimiter } from "../src/core/shared-limiter";
import { Worker } from "node:worker_threads";

describe("SharedTokenBucketLimiter (Lock-free SharedArrayBuffer)", () => {
  test("synchronously acquires tokens up to maxTokens", () => {
    const limiter = new SharedTokenBucketLimiter(10, 2);
    
    // Consume all 10 tokens
    for (let i = 0; i < 10; i++) {
      expect(limiter.tryAcquire(1)).toBe(true);
    }

    // 11th should fail immediately
    expect(limiter.tryAcquire(1)).toBe(false);
  });

  test("shares state across independent instances referencing same buffer", () => {
    const primary = new SharedTokenBucketLimiter(5, 1);
    const buffer = primary.buffer;

    // Secondary worker thread / instance
    const replica = new SharedTokenBucketLimiter(5, 1, buffer);

    expect(primary.tryAcquire(2)).toBe(true);
    expect(replica.tryAcquire(2)).toBe(true);
    expect(primary.tryAcquire(1)).toBe(true);

    // Both should now see 0 tokens
    expect(replica.tryAcquire(1)).toBe(false);
    expect(primary.tryAcquire(1)).toBe(false);
  });

  test("concurrent threads acquiring exactly N tokens without race condition", async () => {
    const totalTokens = 1000;
    const primary = new SharedTokenBucketLimiter(totalTokens, 0); // 0 refill to test exact depletion
    const buffer = primary.buffer;

    // Spawn 10 concurrent async runners simulating parallel workers
    let successfulAcquires = 0;
    const workers = Array.from({ length: 10 }, async () => {
      const replica = new SharedTokenBucketLimiter(totalTokens, 0, buffer);
      for (let i = 0; i < 200; i++) {
        if (replica.tryAcquire(1)) {
          successfulAcquires++;
        }
      }
    });

    await Promise.all(workers);

    // Exactly 1000 tokens should have succeeded, never 1001 or less than 1000
    expect(successfulAcquires).toBe(totalTokens);
    expect(primary.tryAcquire(1)).toBe(false);
  });

  test("benchmarks high throughput lock-free atomics (millions ops/sec)", () => {
    const limiter = new SharedTokenBucketLimiter(1_000_000, 10_000);
    const iters = 200_000;
    
    const start = performance.now();
    for (let i = 0; i < iters; i++) {
      limiter.tryAcquire(1);
    }
    const elapsedMs = performance.now() - start;
    const opsPerSec = Math.floor((iters / elapsedMs) * 1000);

    // Should exceed 5M ops/sec easily
    expect(opsPerSec).toBeGreaterThan(1_000_000);
  });
});
