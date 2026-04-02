# rate-limiter

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)]()

Token bucket and sliding window rate limiter library for TypeScript/Node.js. Two battle-tested algorithms behind a single unified interface, with zero external dependencies.

## Why?

Rate limiting is foundational infrastructure for APIs, job queues, and any system that needs to control throughput. This library provides two complementary algorithms â token bucket (smooth, burst-tolerant) and sliding window counter (strict, window-based) â both injectable with custom clocks for deterministic testing.

## Installation

```bash
npm install rate-limiter
```

Or install from source:

```bash
git clone https://github.com/nripankadas07/rate-limiter.git
cd rate-limiter
npm install && npm run build
```

## Quick Start

### Unified Interface

```typescript
import { RateLimiter } from "rate-limiter";

// Token bucket: 100 requests, refilling 10/sec
const limiter = new RateLimiter({
  strategy: "token-bucket",
  capacity: 100,
  refillRate: 10,
});

const result = limiter.limit();
if (result.allowed) {
  console.log(`Allowed. ${result.remaining} remaining.`);
} else {
  console.log(`Rate limited. Retry after ${result.retryAfter}ms.`);
}
```

### Token Bucket (Direct)

Best for APIs where you want to allow short bursts while maintaining an average rate.

```typescript
import { TokenBucket } from "rate-limiter";

const bucket = new TokenBucket({
  capacity: 50,     // max burst size
  refillRate: 10,   // tokens per second
});

if (bucket.consume()) {
  // Request allowed
}

// Consume multiple tokens (e.g., for weighted requests)
bucket.consume(5);

// Check without consuming
console.log(bucket.getAvailableTokens());

// How long until 3 tokens are available?
console.log(bucket.getRetryAfter(3)); // milliseconds
```

### Sliding Window Counter (Direct)

Best for strict per-window limits (e.g., "100 requests per minute").

```typescript
import { SlidingWindowCounter } from "rate-limiter";

const window = new SlidingWindowCounter({
  limit: 100,         // max requests per window
  windowMs: 60_000,   // 1 minute window
});

if (window.consume()) {
  // Request allowed
}

console.log(window.getRemaining());   // requests left
console.log(window.getRetryAfter());  // ms until reset
```

## Testing with Custom Clocks

Both algorithms accept a `clock` function for deterministic tests:

```typescript
let now = 0;
const clock = () => now;

const bucket = new TokenBucket({ capacity: 5, refillRate: 1, clock });
bucket.consume(); // 4 remaining

now += 2000; // advance 2 seconds
bucket.getAvailableTokens(); // 5 (refilled, capped at capacity)
```

## API Reference

### `RateLimiter`

Unified wrapper for both strategies.

- **`new RateLimiter(options)`** â Create with `{ strategy: "token-bucket", ...bucketOpts }` or `{ strategy: "sliding-window", ...windowOpts }`.
- **`limit(count?)`** â Returns `RateLimitResult { allowed, remaining, retryAfter }`.
- **`reset()`** â Reset all state.

### `TokenBucket`

- **`consume(count?)`** â Consume tokens. Returns `boolean`.
- **`getAvailableTokens()`** â Current token count.
- **`getRetryAfter(count?)`** â Milliseconds until tokens are available.
- **`reset()`** â Refill to capacity.

### `SlidingWindowCounter`

- **`consume()`** â Record a request. Returns `boolean`.
- **`getEstimatedCount()`** â Weighted request count in the sliding window.
- **`getRemaining()`** â Remaining requests allowed.
- **`getRetryAfter()`** â Milliseconds until the window shifts enough.
- **`reset()`** â Clear all counters.

## Architecture

```
src/
âââ token-bucket.ts     # Token bucket algorithm with refill logic
âââ sliding-window.ts   # Sliding window counter with interpolation
âââ rate-limiter.ts     # Unified interface wrapping both strategies
âââ index.ts            # Public exports
```

The token bucket uses a lazy refill pattern â tokens are calculated on demand based on elapsed time, not with timers. The sliding window counter uses weighted interpolation between the current and previous window for a smooth approximation without per-request timestamps. Both are O(1) per operation with zero allocations on the hot path.

## License

MIT License â Copyright 2024 Nripanka Das
