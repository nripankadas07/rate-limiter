import { TokenBucket } from "../token-bucket";

describe("TokenBucket", () => {
  let now: number;
  const clock = () => now;

  beforeEach(() => {
    now = 1000000;
  });

  it("should allow requests when tokens are available", () => {
    const bucket = new TokenBucket({ capacity: 10, refillRate: 1, clock });
    expect(bucket.consume()).toBe(true);
  });

  it("should reject requests when tokens are exhausted", () => {
    const bucket = new TokenBucket({ capacity: 2, refillRate: 1, clock });
    expect(bucket.consume()).toBe(true);
    expect(bucket.consume()).toBe(true);
    expect(bucket.consume()).toBe(false);
  });

  it("should refill tokens over time", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 2, clock });

    // Consume all tokens
    for (let i = 0; i < 5; i++) bucket.consume();
    expect(bucket.consume()).toBe(false);

    // Advance 1 second â should refill 2 tokens
    now += 1000;
    expect(bucket.consume()).toBe(true);
    expect(bucket.consume()).toBe(true);
    expect(bucket.consume()).toBe(false);
  });

  it("should not exceed capacity on refill", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 100, clock });
    now += 10000; // long time passes
    expect(bucket.getAvailableTokens()).toBe(5);
  });

  it("should consume multiple tokens at once", () => {
    const bucket = new TokenBucket({ capacity: 10, refillRate: 1, clock });
    expect(bucket.consume(5)).toBe(true);
    expect(bucket.getAvailableTokens()).toBe(5);
    expect(bucket.consume(6)).toBe(false);
  });

  it("should calculate retry-after time", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 2, clock });
    for (let i = 0; i < 5; i++) bucket.consume();
    // Need 1 token, refill rate is 2/sec â 500ms
    expect(bucket.getRetryAfter(1)).toBe(500);
  });

  it("should return 0 retry-after when tokens available", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1, clock });
    expect(bucket.getRetryAfter()).toBe(0);
  });

  it("should reset to full capacity", () => {
    const bucket = new TokenBucket({ capacity: 10, refillRate: 1, clock });
    for (let i = 0; i < 10; i++) bucket.consume();
    expect(bucket.getAvailableTokens()).toBe(0);
    bucket.reset();
    expect(bucket.getAvailableTokens()).toBe(10);
  });

  it("should throw on invalid capacity", () => {
    expect(() => new TokenBucket({ capacity: 0, refillRate: 1 })).toThrow(
      "Capacity must be positive"
    );
  });

  it("should throw on invalid refill rate", () => {
    expect(() => new TokenBucket({ capacity: 10, refillRate: -1 })).toThrow(
      "Refill rate must be positive"
    );
  });

  it("should throw on invalid consume count", () => {
    const bucket = new TokenBucket({ capacity: 10, refillRate: 1, clock });
    expect(() => bucket.consume(0)).toThrow("Count must be positive");
  });
});
