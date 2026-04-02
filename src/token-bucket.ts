/**
 * Token bucket rate limiter.
 *
 * Tokens are added at a fixed rate up to a maximum capacity.
 * Each request consumes one or more tokens. If insufficient
 * tokens are available, the request is rejected.
 */

export interface TokenBucketOptions {
  /** Maximum number of tokens the bucket can hold. */
  capacity: number;
  /** Number of tokens added per second. */
  refillRate: number;
  /** Optional: inject a clock for testing (returns ms). */
  clock?: () => number;
}

export class TokenBucket {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private lastRefill: number;
  private readonly clock: () => number;

  constructor(options: TokenBucketOptions) {
    if (options.capacity <= 0) {
      throw new Error("Capacity must be positive");
    }
    if (options.refillRate <= 0) {
      throw new Error("Refill rate must be positive");
    }

    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.clock = options.clock ?? (() => Date.now());
    this.tokens = this.capacity;
    this.lastRefill = this.clock();
  }

  /**
   * Attempt to consume tokens from the bucket.
   *
   * @param count - Number of tokens to consume (default: 1).
   * @returns `true` if the request is allowed, `false` if rate-limited.
   */
  consume(count: number = 1): boolean {
    if (count <= 0) {
      throw new Error("Count must be positive");
    }

    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Check how many tokens are available without consuming any.
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Estimate wait time in milliseconds until `count` tokens are available.
   */
  getRetryAfter(count: number = 1): number {
    this.refill();
    if (this.tokens >= count) return 0;
    const deficit = count - this.tokens;
    return Math.ceil((deficit / this.refillRate) * 1000);
  }

  /**
   * Reset the bucket to full capacity.
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = this.clock();
  }

  private refill(): void {
    const now = this.clock();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}
