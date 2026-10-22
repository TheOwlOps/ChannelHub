/**
 * Retry with exponential backoff — a small, dependency-free reliability
 * primitive for wrapping flaky operations (channel connects, API sends).
 *
 * @example
 * ```ts
 * const res = await withRetry(() => adapter.sendText(chatId, "hi"), {
 *   retries: 3,
 *   baseDelayMs: 200,
 *   onRetry: (err, attempt) => console.warn(`retry #${attempt}`, err),
 * });
 * ```
 */

/** Options controlling {@link withRetry} and {@link computeBackoffDelay}. */
export interface RetryOptions {
  /** How many times to retry after the first failure. Default: 3 (so at most `retries + 1` attempts). */
  retries?: number;
  /** Delay in milliseconds before the first retry; doubles on each subsequent retry. Default: 200. */
  baseDelayMs?: number;
  /** Upper bound for any single delay, in milliseconds. Default: 5000. */
  maxDelayMs?: number;
  /**
   * Whether to randomize each delay by a factor in [0.7, 1.3) so that many
   * clients do not retry in lockstep. Default: true.
   */
  jitter?: boolean;
  /**
   * Predicate consulted after each failure. Return `false` to give up
   * immediately and rethrow the error without further retries.
   */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /**
   * Callback invoked before each retry, with the error that caused it, the
   * 1-based retry number and the delay about to be waited.
   */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
  /**
   * How to wait between attempts. Defaults to a real `setTimeout` promise;
   * inject a fake in tests to avoid real waiting.
   */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 5000;
const DEFAULT_RETRIES = 3;

/** Default sleep implementation backed by a real timer. */
function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Computes the delay to wait before retry number `attempt`.
 *
 * `attempt` is 1-based: the first retry is attempt 1. The base delay doubles
 * on every attempt (`baseDelayMs * 2^(attempt-1)`), is capped at
 * `maxDelayMs`, and — unless `jitter: false` — is scaled by a random factor
 * in [0.7, 1.3) and rounded to whole milliseconds.
 *
 * @param attempt 1-based retry number (1 = first retry).
 * @param options Backoff options; only the delay-related fields are used.
 * @returns The delay in milliseconds to wait before that retry.
 */
export function computeBackoffDelay(attempt: number, options?: RetryOptions): number {
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitter = options?.jitter ?? true;

  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(maxDelayMs, exponential);
  if (!jitter) return capped;
  return Math.round(capped * (0.7 + Math.random() * 0.6));
}

/**
 * Runs `fn`, retrying it with exponential backoff when it throws.
 *
 * `fn` receives the 0-based attempt number: `0` for the initial call, then
 * `1`, `2`, … for each retry. After a failure, if retries remain and
 * `shouldRetry` (when provided) does not return `false`, `onRetry` is called
 * and the computed backoff delay is awaited before the next attempt. When
 * retries are exhausted — or `shouldRetry` vetoes — the last error is
 * rethrown unchanged.
 *
 * @param fn The operation to attempt; receives the 0-based attempt number.
 * @param options Retry/backoff options. See {@link RetryOptions}.
 * @returns Whatever `fn` resolves with on the first successful attempt.
 * @throws The last error thrown by `fn` when all attempts fail.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const sleep = options?.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt >= retries) break;
      if (options?.shouldRetry && !options.shouldRetry(err, attempt)) throw err;
      const retryNumber = attempt + 1;
      const delayMs = computeBackoffDelay(retryNumber, options);
      options?.onRetry?.(err, retryNumber, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
