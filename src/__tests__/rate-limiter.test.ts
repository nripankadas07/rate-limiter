import { RateLimiter } from "../rate-limiter";

describe("RateLimiter", () => {
  let now: number;
  const clock = () => now;

  beforeEach(() => {
    now = 1000000;
  });

  describe("with token-bucket strategy", () => {
    it("should allow and then reject requests", () => {
      const rl = new RateLimiter({
        strategy: "token-bucket",
        capacity: 3,
        refillRate: 1,
        clock,
      });

      const r1 = rl.limit();
      expect(r1.allowed).toBe(true);
      expect(r1.retryAfter).toBe(0);

      rl.limit();
      rl.limit();

      const r4 = rl.limit();
      expect(r4.allowed).toBe(false);
      expect(r4.retryAfter).toBeGreaterThan(0);
    });

    it("should report remaining tokens", () => {
      const rl = new RateLimiter({
        strategy: "token-bucket",
        capacity: 5,
        refillRate: 1,
        clock,
      });

      const result = rl.limit(2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it("should reset correctly", () => {
      const rl = new RateLimiter({
        strategy: "token-bucket",
        capacity: 2,
        refillRate: 1,
        clock,
      });

      rl.limit();
      rl.limit();
      expect(rl.limit().allowed).toBe(false);

      rl.reset();
      expect(rl.limit().allowed).toBe(true);
    });
  });

  describe("with sliding-window strategy", () => {
    it("should allow and then reject requests", () => {
      const rl = new RateLimiter({
        strategy: "sliding-window",
        limit: 2,
        windowMs: 1000,
        clock,
      });

      expect(rl.limit().allowed).toBe(true);
      expect(rl.limit().allowed).toBe(true);
      expect(rl.limit().allowed).toBe(false);
    });

    it("should report remaining capacity", () => {
      const rl = new RateLimiter({
        strategy: "sliding-window",
        limit: 5,
        windowMs: 1000,
        clock,
      });

      rl.limit();
      const result = rl.limit();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it("should reset correctly", () => {
      const rl = new RateLimiter({
        strategy: "sliding-window",
        limit: 1,
        windowMs: 1000,
        clock,
      });

      rl.limit();
      expect(rl.limit().allowed).toBe(false);

      rl.reset();
      expect(rl.limit().allowed).toBe(true);
    });
  });
});
