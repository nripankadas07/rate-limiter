import { SlidingWindowCounter } from "../sliding-window";

describe("SlidingWindowCounter", () => {
  let now: number;
  const clock = () => now;

  beforeEach(() => {
    // Start at a clean window boundary (divisible by 1000)
    now = 1000000;
  });

  it("should allow requests within the limit", () => {
    const sw = new SlidingWindowCounter({ limit: 5, windowMs: 1000, clock });
    for (let i = 0; i < 5; i++) {
      expect(sw.consume()).toBe(true);
    }
  });

  it("should reject requests exceeding the limit", () => {
    const sw = new SlidingWindowCounter({ limit: 3, windowMs: 1000, clock });
    expect(sw.consume()).toBe(true);
    expect(sw.consume()).toBe(true);
    expect(sw.consume()).toBe(true);
    expect(sw.consume()).toBe(false);
  });

  it("should allow requests after window advances", () => {
    const sw = new SlidingWindowCounter({ limit: 2, windowMs: 1000, clock });
    expect(sw.consume()).toBe(true);
    expect(sw.consume()).toBe(true);
    expect(sw.consume()).toBe(false);

    // Move to next window
    now += 1000;
    // Previous window had 2, but weight decreases â at start of new window, weight â 1
    // so estimated = 0 + floor(2 * 1) = 2, still limited
    // Move a bit further so the weight drops
    now += 500; // weight = 1 - 500/1000 = 0.5, estimated = 0 + floor(2*0.5) = 1
    expect(sw.consume()).toBe(true);
  });

  it("should report correct remaining count", () => {
    const sw = new SlidingWindowCounter({ limit: 5, windowMs: 1000, clock });
    expect(sw.getRemaining()).toBe(5);
    sw.consume();
    sw.consume();
    expect(sw.getRemaining()).toBe(3);
  });

  it("should reset all counters", () => {
    const sw = new SlidingWindowCounter({ limit: 3, windowMs: 1000, clock });
    sw.consume();
    sw.consume();
    sw.consume();
    expect(sw.getRemaining()).toBe(0);
    sw.reset();
    expect(sw.getRemaining()).toBe(3);
  });

  it("should handle skipped windows (stale data)", () => {
    const sw = new SlidingWindowCounter({ limit: 5, windowMs: 1000, clock });
    sw.consume();
    sw.consume();
    sw.consume();

    // Skip multiple windows
    now += 5000;
    // All previous data should be stale
    expect(sw.getRemaining()).toBe(5);
  });

  it("should calculate retry-after", () => {
    const sw = new SlidingWindowCounter({ limit: 1, windowMs: 1000, clock });
    sw.consume();
    const retryAfter = sw.getRetryAfter();
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(1000);
  });

  it("should return 0 retry-after when requests available", () => {
    const sw = new SlidingWindowCounter({ limit: 5, windowMs: 1000, clock });
    expect(sw.getRetryAfter()).toBe(0);
  });

  it("should throw on invalid limit", () => {
    expect(
      () => new SlidingWindowCounter({ limit: 0, windowMs: 1000 })
    ).toThrow("Limit must be positive");
  });

  it("should throw on invalid window duration", () => {
    expect(
      () => new SlidingWindowCounter({ limit: 5, windowMs: -1 })
    ).toThrow("Window duration must be positive");
  });
});
