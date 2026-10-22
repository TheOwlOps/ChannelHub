import { describe, test, expect } from "bun:test";
import { computeBackoffDelay, withRetry } from "../../src/core/reliability/retry";

/** Fake sleep that records the requested delays instead of really waiting. */
function fakeSleep() {
  const delays: number[] = [];
  const sleep = async (ms: number): Promise<void> => {
    delays.push(ms);
  };
  return { delays, sleep };
}

describe("withRetry", () => {
  test("succeeds on the first try without sleeping", async () => {
    const { delays, sleep } = fakeSleep();
    const attempts: number[] = [];

    const result = await withRetry(
      async (attempt) => {
        attempts.push(attempt);
        return "ok";
      },
      { sleep, jitter: false },
    );

    expect(result).toBe("ok");
    expect(attempts).toEqual([0]);
    expect(delays).toEqual([]);
  });

  test("fails twice then succeeds, with exact increasing backoff delays", async () => {
    const { delays, sleep } = fakeSleep();
    const attempts: number[] = [];
    const retriesSeen: Array<{ attempt: number; delayMs: number }> = [];
    let calls = 0;

    const result = await withRetry(
      async (attempt) => {
        attempts.push(attempt);
        calls++;
        if (calls < 3) throw new Error(`boom ${calls}`);
        return "recovered";
      },
      {
        sleep,
        jitter: false,
        baseDelayMs: 100,
        onRetry: (_err, attempt, delayMs) => retriesSeen.push({ attempt, delayMs }),
      },
    );

    expect(result).toBe("recovered");
    expect(attempts).toEqual([0, 1, 2]);
    expect(delays).toEqual([100, 200]);
    expect(retriesSeen).toEqual([
      { attempt: 1, delayMs: 100 },
      { attempt: 2, delayMs: 200 },
    ]);
  });

  test("exhausts retries and throws the last error", async () => {
    const { delays, sleep } = fakeSleep();
    let calls = 0;

    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error(`failure ${calls}`);
        },
        { sleep, jitter: false, baseDelayMs: 50, retries: 2 },
      ),
    ).rejects.toThrow("failure 3");

    // 1 initial attempt + 2 retries = 3 calls, with a sleep before each retry.
    expect(calls).toBe(3);
    expect(delays).toEqual([50, 100]);
  });

  test("stops immediately when shouldRetry returns false", async () => {
    const { delays, sleep } = fakeSleep();
    let calls = 0;

    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("fatal");
        },
        {
          sleep,
          jitter: false,
          retries: 5,
          shouldRetry: () => false,
        },
      ),
    ).rejects.toThrow("fatal");

    expect(calls).toBe(1);
    expect(delays).toEqual([]);
  });
});

describe("computeBackoffDelay", () => {
  test("caps the delay at maxDelayMs", () => {
    const options = { baseDelayMs: 100, maxDelayMs: 250, jitter: false };
    expect(computeBackoffDelay(1, options)).toBe(100);
    expect(computeBackoffDelay(2, options)).toBe(200);
    expect(computeBackoffDelay(3, options)).toBe(250);
    expect(computeBackoffDelay(10, options)).toBe(250);
  });

  test("doubles each attempt when jitter is off", () => {
    const options = { baseDelayMs: 200, jitter: false };
    expect(computeBackoffDelay(1, options)).toBe(200);
    expect(computeBackoffDelay(2, options)).toBe(400);
    expect(computeBackoffDelay(3, options)).toBe(800);
  });
});
