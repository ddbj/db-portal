import { describe, expect, test } from "vitest"

import { createRateLimiter } from "../../../../server/llm/rate-limit"

describe("rateLimiter", () => {
  test("allows under per-IP limit", () => {
    const limiter = createRateLimiter({ perIpPerMin: 3, perSessionPerMin: 100 }, () => 0)
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
  })

  test("rejects when per-IP exceeds", () => {
    const limiter = createRateLimiter({ perIpPerMin: 2, perSessionPerMin: 100 }, () => 0)
    limiter.check("1.1.1.1", undefined)
    limiter.check("1.1.1.1", undefined)
    const decision = limiter.check("1.1.1.1", undefined)
    if (decision.ok) throw new Error("expected block")
    expect(decision.axis).toBe("ip")
  })

  test("rejects when per-session exceeds", () => {
    const limiter = createRateLimiter({ perIpPerMin: 100, perSessionPerMin: 1 }, () => 0)
    limiter.check("1.1.1.1", "s")
    const decision = limiter.check("1.1.1.1", "s")
    if (decision.ok) throw new Error("expected block")
    expect(decision.axis).toBe("session")
  })

  test("window resets after 60 seconds", () => {
    let now = 0
    const limiter = createRateLimiter({ perIpPerMin: 1, perSessionPerMin: 100 }, () => now)
    limiter.check("1.1.1.1", undefined)
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(false)
    now += 60_001
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
  })

  test("retryAfter is positive when blocked", () => {
    let now = 0
    const limiter = createRateLimiter({ perIpPerMin: 1, perSessionPerMin: 100 }, () => now)
    limiter.check("1.1.1.1", undefined)
    now += 1_000
    const decision = limiter.check("1.1.1.1", undefined)
    if (decision.ok) throw new Error("expected block")
    expect(decision.retryAfterSec).toBeGreaterThan(0)
  })
})
