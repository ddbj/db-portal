import { describe, expect, test } from "vitest"

import { createRateLimiter } from "../../../../server/llm/rate-limit"

describe("rateLimiter", () => {
  test("rateLimiter_underPerIpLimit_allowsRequest", () => {
    const limiter = createRateLimiter({ perIpPerMin: 3, perSessionPerMin: 100 }, () => 0)
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
  })

  test("rateLimiter_perIpExceeded_returnsIpBlock", () => {
    const limiter = createRateLimiter({ perIpPerMin: 2, perSessionPerMin: 100 }, () => 0)
    limiter.check("1.1.1.1", undefined)
    limiter.check("1.1.1.1", undefined)
    const decision = limiter.check("1.1.1.1", undefined)
    if (decision.ok) throw new Error("expected block")
    expect(decision.axis).toBe("ip")
  })

  test("rateLimiter_perSessionExceeded_returnsSessionBlock", () => {
    const limiter = createRateLimiter({ perIpPerMin: 100, perSessionPerMin: 1 }, () => 0)
    limiter.check("1.1.1.1", "s")
    const decision = limiter.check("1.1.1.1", "s")
    if (decision.ok) throw new Error("expected block")
    expect(decision.axis).toBe("session")
  })

  test("rateLimiter_sessionBlocked_doesNotConsumeIpBudget", () => {
    // Tripping the session axis must not burn the shared per-IP budget, else one
    // session repeatedly hitting its own limit would deny the whole IP pool.
    const limiter = createRateLimiter({ perIpPerMin: 2, perSessionPerMin: 1 }, () => 0)
    expect(limiter.check("1.1.1.1", "s").ok).toBe(true)
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("1.1.1.1", "s").ok).toBe(false)
    }
    // Only one IP hit was committed, so a fresh session still passes the IP axis.
    expect(limiter.check("1.1.1.1", "s2").ok).toBe(true)
    const decision = limiter.check("1.1.1.1", "s3")
    if (decision.ok) throw new Error("expected ip block")
    expect(decision.axis).toBe("ip")
  })

  test("rateLimiter_oneMillisecondBeforeWindowEnd_stillBlocked", () => {
    // predicate is `nowMs - startMs >= 60_000`; just before that, window is still active
    let now = 0
    const limiter = createRateLimiter({ perIpPerMin: 1, perSessionPerMin: 100 }, () => now)
    limiter.check("1.1.1.1", undefined)
    now = 59_999
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(false)
  })

  test("rateLimiter_exactlyAtWindowEnd_resetsAndAllows", () => {
    let now = 0
    const limiter = createRateLimiter({ perIpPerMin: 1, perSessionPerMin: 100 }, () => now)
    limiter.check("1.1.1.1", undefined)
    now = 60_000
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
  })

  test("rateLimiter_pastTwoWindows_resetsAndAllows", () => {
    let now = 0
    const limiter = createRateLimiter({ perIpPerMin: 1, perSessionPerMin: 100 }, () => now)
    limiter.check("1.1.1.1", undefined)
    now = 120_001
    expect(limiter.check("1.1.1.1", undefined).ok).toBe(true)
  })

  test("rateLimiter_blocked_retryAfterIsPositive", () => {
    let now = 0
    const limiter = createRateLimiter({ perIpPerMin: 1, perSessionPerMin: 100 }, () => now)
    limiter.check("1.1.1.1", undefined)
    now += 1_000
    const decision = limiter.check("1.1.1.1", undefined)
    if (decision.ok) throw new Error("expected block")
    expect(decision.retryAfterSec).toBeGreaterThan(0)
  })
})
