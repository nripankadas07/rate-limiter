/**
 * Sliding window counter rate limiter.
 *
 * Tracks request counts in fixed time windows and uses weighted
 * interpolation between the current and previous window for a
 * smooth sliding effect.
 */

export interface SlidingWindowOptions {
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Optional: inject a clock for testing (returns ms). */
  clock?: () => number;
}

interface WindowState {
  count: number;
  start: number;
}

export class SlidingWindowCounter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly clock: () => number;
  private currentWindow: WindowState;
  private previousWindow: WindowState;

  constructor(options: SlidingWindowOptions) {
    if (options.limit <= 0) {
      throw new Error("Limit must be positive");
    }
    if (options.windowMs <= 0) {
      throw new Error("Window duration must be positive");
    }

    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.clock = options.clock ?? (() => Date.now());

    const now = this.clock();
    this.currentWindow = { count: 0, start: this.windowStart(now) };
    this.previousWindow = { count: 0, start: this.windowStart(now) - this.windowMs };
  }

  /**
   * Attempt to record a request.
   *
   * @returns `true` if allowed, `false` if rate-limited.
   */
  consume(): boolean {
    this.advance();
    const estimated = this.getEstimatedCount();

    if (estimated >= this.limit) {
      return false;
    }

    this.currentWindow.count++;
    return true;
  }

  /**
   * Get the weighted estimated count (sliding window interpolation).
   */
  getEstimatedCount(): number {
    this.advance();
    const now = this.clock();
    const elapsed = now - this.currentWindow.start;
    const weight = 1 - elapsed / this.windowMs;
    return this.currentWindow.count + Math.floor(this.previousWindow.count * Math.max(weight, 0));
  }

  /**
   * Get remaining requests in the current window.
   */
  getRemaining(): number {
    return Math.max(0, this.limit - this.getEstimatedCount());
  }

  /**
   * Estimate milliseconds until the window resets enough to allow a request.
   */
  getRetryAfter(): number {
    if (this.getRemaining() > 0) return 0;
    const now = this.clock();
    return this.currentWindow.start + this.windowMs - now;
  }

  /**
   * Reset all counters.
   */
  reset(): void {
    const now = this.clock();
    this.currentWindow = { count: 0, start: this.windowStart(now) };
    this.previousWindow = { count: 0, start: this.windowStart(now) - this.windowMs };
  }

  private windowStart(time: number): number {
    return Math.floor(time / this.windowMs) * this.windowMs;
  }

  private advance(): void {
    const now = this.clock();
    const currentStart = this.windowStart(now);

    if (currentStart !== this.currentWindow.start) {
      // Check if we've moved one window forward or more
      if (currentStart - this.currentWindow.start === this.windowMs) {
        this.previousWindow = { ...this.currentWindow };
      } else {
        // Skipped more than one window â previous data is stale
        this.previousWindow = { count: 0, start: currentStart - this.windowMs };
      }
      this.currentWindow = { count: 0, start: currentStart };
    }
  }
}
