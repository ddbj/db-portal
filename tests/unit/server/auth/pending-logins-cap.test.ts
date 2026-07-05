import { describe, expect, test } from "vitest"

import { createPendingLoginStore, PENDING_MAX_ENTRIES } from "../../../../server/auth/pending-logins"

const entry = (state: string, createdAt: number) => ({
  codeVerifier: `cv-${state}`,
  state,
  nonce: `n-${state}`,
  returnTo: "/",
  createdAt,
})

describe("createPendingLoginStore — DoS cap", () => {
  test("put_belowCap_doesNotEvict", () => {
    let now = 0
    const store = createPendingLoginStore(() => now)
    for (let i = 0; i < 100; i++) {
      now = i
      store.put(entry(`s-${i}`, i))
    }
    expect(store.size()).toBe(100)
    expect(store.take("s-0")).toBeDefined()
  })

  test("put_atCap_evictsOldestFifo", () => {
    let now = 0
    const store = createPendingLoginStore(() => now)
    // ちょうど cap まで埋める
    for (let i = 0; i < PENDING_MAX_ENTRIES; i++) {
      now = i
      store.put(entry(`s-${i}`, i))
    }
    expect(store.size()).toBe(PENDING_MAX_ENTRIES)
    // cap 到達後にもう 1 件入れる → 最古 (s-0) が evict される
    now = PENDING_MAX_ENTRIES
    store.put(entry("s-new", PENDING_MAX_ENTRIES))
    expect(store.size()).toBe(PENDING_MAX_ENTRIES)
    expect(store.take("s-0")).toBeUndefined()
    expect(store.take("s-new")).toBeDefined()
  })

  test("put_repeatedFlood_doesNotExceedCap", () => {
    let now = 0
    const store = createPendingLoginStore(() => now)
    // cap の 5 倍流し込み続けても、 store サイズは決して cap を超えない。
    for (let i = 0; i < PENDING_MAX_ENTRIES * 5; i++) {
      now = i
      store.put(entry(`s-${i}`, i))
    }
    expect(store.size()).toBe(PENDING_MAX_ENTRIES)
  })
})
