type Window = { startMs: number; count: number }

const WINDOW_MS = 60_000
const CLEANUP_INTERVAL_MS = 5 * 60_000

export type Clock = () => number

export type LimitDecision =
  | { ok: true }
  | { ok: false; axis: "ip" | "session"; retryAfterSec: number }

export type RateLimitConfig = {
  perIpPerMin: number
  perSessionPerMin: number
}

export type RateLimiter = {
  check: (ip: string, sid: string | undefined) => LimitDecision
  cleanup: () => void
}

const advanceWindow = (window: Window, nowMs: number): Window => {
  if (nowMs - window.startMs >= WINDOW_MS) {
    return { startMs: nowMs, count: 0 }
  }

  return window
}

export const createRateLimiter = (
  config: RateLimitConfig,
  clock: Clock = Date.now,
): RateLimiter => {
  const ipWindows = new Map<string, Window>()
  const sessionWindows = new Map<string, Window>()

  type AxisOutcome = { ok: true } | { ok: false; retryAfterSec: number }

  const tryHit = (
    map: Map<string, Window>,
    key: string,
    limit: number,
    now: number,
  ): AxisOutcome => {
    const prev = map.get(key) ?? { startMs: now, count: 0 }
    const advanced = advanceWindow(prev, now)
    if (advanced.count >= limit) {
      const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - advanced.startMs)) / 1000))

      return { ok: false, retryAfterSec }
    }
    advanced.count += 1
    map.set(key, advanced)

    return { ok: true }
  }

  const check: RateLimiter["check"] = (ip, sid) => {
    const now = clock()
    const ipDecision = tryHit(ipWindows, ip, config.perIpPerMin, now)
    if (!ipDecision.ok) return { ok: false, axis: "ip", retryAfterSec: ipDecision.retryAfterSec }
    if (sid !== undefined) {
      const sessionDecision = tryHit(sessionWindows, sid, config.perSessionPerMin, now)
      if (!sessionDecision.ok) {
        return { ok: false, axis: "session", retryAfterSec: sessionDecision.retryAfterSec }
      }
    }

    return { ok: true }
  }

  const cleanup = (): void => {
    const now = clock()
    for (const [k, v] of ipWindows) {
      if (now - v.startMs >= WINDOW_MS) ipWindows.delete(k)
    }
    for (const [k, v] of sessionWindows) {
      if (now - v.startMs >= WINDOW_MS) sessionWindows.delete(k)
    }
  }

  return { check, cleanup }
}

let active: RateLimiter | undefined

export const setActiveRateLimiter = (limiter: RateLimiter): void => {
  active = limiter
  const timer = setInterval(() => limiter.cleanup(), CLEANUP_INTERVAL_MS)
  timer.unref?.()
}

export const getActiveRateLimiter = (): RateLimiter | undefined => active
