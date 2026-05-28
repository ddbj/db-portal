import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import {
  createSessionStore,
  SESSION_TTL_MS,
  type SessionEntry,
} from "../../../../server/auth/session-store"

const arbEntry: fc.Arbitrary<SessionEntry> = fc.record({
  tokens: fc.record({
    idToken: fc.string({ minLength: 1, maxLength: 16 }),
  }),
  userInfo: fc.record({
    sub: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    email: fc.constant("user@example.com"),
  }),
  expiresAt: fc.constant(0),
})

describe("sessionStore PBT", () => {
  test.prop([arbEntry, fc.integer({ min: 0, max: SESSION_TTL_MS })])(
    "sessionStorePbt_advanceWithinOrAtTTL_getReturnsEntry",
    (entry, advanceBy) => {
      let now = 1_000
      const store = createSessionStore(() => now)
      store.set("sid", entry)
      now += advanceBy
      const got = store.get("sid")
      expect(got?.userInfo.sub).toBe(entry.userInfo.sub)
    },
  )

  test.prop([arbEntry, fc.integer({ min: SESSION_TTL_MS + 1, max: SESSION_TTL_MS * 4 })])(
    "sessionStorePbt_advancePastTTL_getReturnsUndefined",
    (entry, advanceBy) => {
      let now = 1_000
      const store = createSessionStore(() => now)
      store.set("sid", entry)
      now += advanceBy
      expect(store.get("sid")).toBeUndefined()
    },
  )

  test.prop([arbEntry])(
    "sessionStorePbt_remove_getReturnsUndefined",
    (entry) => {
      const store = createSessionStore(() => 1_000)
      store.set("sid", entry)
      store.remove("sid")
      expect(store.get("sid")).toBeUndefined()
    },
  )
})
