import { describe, expect, test } from "vitest"

import {
  createPendingLoginStore,
  PENDING_TTL_MS,
} from "../../../../server/auth/pending-logins"

describe("pendingLoginStore", () => {
  test("pendingLogins_takeTwice_secondCallReturnsUndefined", () => {
    const now = 1_000
    const store = createPendingLoginStore(() => now)
    store.put({ codeVerifier: "v", state: "s", returnTo: "/", createdAt: now })
    expect(store.take("s")).toBeDefined()
    expect(store.take("s")).toBeUndefined()
  })

  test("pendingLogins_pastTTL_takeReturnsUndefined", () => {
    let now = 1_000
    const store = createPendingLoginStore(() => now)
    store.put({ codeVerifier: "v", state: "s", returnTo: "/", createdAt: now })
    now += PENDING_TTL_MS + 1
    expect(store.take("s")).toBeUndefined()
  })

  test("pendingLogins_exactlyAtTTL_isStillValid", () => {
    let now = 1_000
    const store = createPendingLoginStore(() => now)
    store.put({ codeVerifier: "v", state: "s", returnTo: "/", createdAt: now })
    // predicate is `clock() - createdAt > PENDING_TTL_MS`; equal is still valid
    now += PENDING_TTL_MS
    expect(store.take("s")?.state).toBe("s")
  })

  test("pendingLogins_oneMillisecondPastTTL_takeReturnsUndefined", () => {
    let now = 1_000
    const store = createPendingLoginStore(() => now)
    store.put({ codeVerifier: "v", state: "s", returnTo: "/", createdAt: now })
    now += PENDING_TTL_MS + 1
    expect(store.take("s")).toBeUndefined()
  })

  test("pendingLogins_cleanup_dropsExpiredButKeepsFresh", () => {
    let now = 1_000
    const store = createPendingLoginStore(() => now)
    store.put({ codeVerifier: "v", state: "old", returnTo: "/", createdAt: now })
    now += PENDING_TTL_MS + 1
    store.put({ codeVerifier: "v", state: "new", returnTo: "/", createdAt: now })
    store.cleanup()
    expect(store.take("old")).toBeUndefined()
    expect(store.take("new")).toBeDefined()
  })
})
