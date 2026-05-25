import { describe, expect, test } from "vitest"

import {
  createSessionStore,
  SESSION_TTL_MS,
} from "../../../../server/auth/session-store"

const baseEntry = {
  tokens: {
    accessToken: "atk",
    refreshToken: "rtk",
    idToken: "itk",
    expiresAt: 0,
  },
  userInfo: {
    sub: "user-1",
    name: "Taro",
    email: "taro@example.com",
  },
  expiresAt: 0,
}

describe("sessionStore", () => {
  test("sessionStore_withinTTL_getReturnsEntry", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += 1_000
    expect(store.get("sid")?.userInfo.sub).toBe("user-1")
  })

  test("sessionStore_pastTTL_getReturnsUndefined", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += SESSION_TTL_MS + 1
    expect(store.get("sid")).toBeUndefined()
  })

  test("sessionStore_exactlyAtExpiresAt_isStillValid", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    // entry.expiresAt = 1_000 + SESSION_TTL_MS; predicate is `expiresAt < now`
    now += SESSION_TTL_MS
    expect(store.get("sid")?.userInfo.sub).toBe("user-1")
  })

  test("sessionStore_oneMillisecondPastExpiresAt_isExpired", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += SESSION_TTL_MS + 1
    expect(store.get("sid")).toBeUndefined()
  })

  test("sessionStore_repeatedGet_slidesExpiration", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += SESSION_TTL_MS - 1
    expect(store.get("sid")).toBeDefined()
    now += SESSION_TTL_MS - 1
    expect(store.get("sid")).toBeDefined()
  })

  test("sessionStore_remove_dropsEntry", () => {
    const store = createSessionStore(() => 1_000)
    store.set("sid", baseEntry)
    store.remove("sid")
    expect(store.get("sid")).toBeUndefined()
  })

  test("sessionStore_cleanup_dropsExpiredEntries", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += SESSION_TTL_MS + 1
    store.cleanup()
    expect(store.get("sid")).toBeUndefined()
  })
})
