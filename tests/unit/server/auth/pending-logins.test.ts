import { describe, expect, test } from "vitest"

import {
  createPendingLoginStore,
  PENDING_TTL_MS,
} from "../../../../server/auth/pending-logins"

describe("pendingLogins", () => {
  test("take consumes the entry exactly once", () => {
    const now = 1_000
    const store = createPendingLoginStore(() => now)
    store.put({ codeVerifier: "v", state: "s", returnTo: "/", createdAt: now })
    expect(store.take("s")).toBeDefined()
    expect(store.take("s")).toBeUndefined()
  })

  test("take returns undefined after TTL", () => {
    let now = 1_000
    const store = createPendingLoginStore(() => now)
    store.put({ codeVerifier: "v", state: "s", returnTo: "/", createdAt: now })
    now += PENDING_TTL_MS + 1
    expect(store.take("s")).toBeUndefined()
  })

  test("cleanup drops expired entries", () => {
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
