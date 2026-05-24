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
  test("get returns the entry within TTL", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += 1_000
    expect(store.get("sid")?.userInfo.sub).toBe("user-1")
  })

  test("get returns undefined after TTL", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += SESSION_TTL_MS + 1
    expect(store.get("sid")).toBeUndefined()
  })

  test("get extends TTL (sliding expiration)", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += SESSION_TTL_MS - 1
    expect(store.get("sid")).toBeDefined()
    now += SESSION_TTL_MS - 1
    expect(store.get("sid")).toBeDefined()
  })

  test("remove drops the entry", () => {
    const store = createSessionStore(() => 1_000)
    store.set("sid", baseEntry)
    store.remove("sid")
    expect(store.get("sid")).toBeUndefined()
  })

  test("cleanup removes expired entries", () => {
    let now = 1_000
    const store = createSessionStore(() => now)
    store.set("sid", baseEntry)
    now += SESSION_TTL_MS + 1
    store.cleanup()
    expect(store.get("sid")).toBeUndefined()
  })
})
