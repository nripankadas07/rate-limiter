/**
 * Unified rate limiter with pluggable strategy.
 *
 * Wraps TokenBucket and SlidingWindowCounter behind a single
 * interface for easy switching between algorithms.
 */

import { TokenBucket, type TokenBucketOptions } from "./token-bucket";
import { SlidingWindowCounter, type SlidingWindowOptions } from "./sliding-window";

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining capacity. */
  remaining: number;
  /** Milliseconds to wait before retrying (0 if allowed). */
  retryAfter: number;
}

export type RateLimiterOptions =
  | { strategy: "token-bucket" } & TokenBucketOptions
  | { strategy: "sliding-window" } & SlidingWindowOptions;

export class RateLimiter {
  private readonly strategy: string;
  private readonly bucket?: TokenBucket;
  private readonly window?: SlidingWindowCounter;

  constructor(options: RateLimiterOptions) {
    this.strategy = options.strategy;

    if (options.strategy === "token-bucket") {
      const { strategy: _, ...bucketOpts } = options;
      this.bucket = new TokenBucket(bucketOpts);
    } else if (options.strategy === "sliding-window") {
      const { strategy: _, ...windowOpts } = options;
      this.window = new SlidingWindowCounter(windowOpts);
    } else {
      throw new Error(`Unknown strategy: ${(options as any).strategy}`);
    }
  }

  /**
   * Check and consume a rate limit token.
   *
   * @param count - Tokens to consume (only for token-bucket strategy).
   * @returns A `RateLimitResult` with allowed status and metadata.
   */
  limit(count: number = 1): RateLimitResult {
    if (this.bucket) {
      const allowed = this.bucket.consume(count);
      return {
        allowed,
        remaining: this.bucket.getAvailableTokens(),
        retryAfter: allowed ? 0 : this.bucket.getRetryAfter(count),
      };
    }

    if (this.window) {
      const allowed = this.window.consume();
      return {
        allowed,
        remaining: this.window.getRemaining(),
        retryAfter: allowed ? 0 : this.window.getRetryAfter(),
      };
    }

    throw new Error("No strategy configured");
  }

  /**
   * Reset the rate limiter state.
   */
  reset(): void {
    this.bucket?.reset();
    this.window?.reset();
  }
}
