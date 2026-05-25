import { describe, expect, test } from "vitest"

import { llmAvailabilityFromHealth } from "~/features/search"

describe("llmAvailabilityFromHealth", () => {
  test("nullHealth_notReady", () => {
    const result = llmAvailabilityFromHealth(null)
    expect(result.ready).toBe(false)
    expect(result.health).toBe(null)
  })

  test("statusOk_ready", () => {
    const result = llmAvailabilityFromHealth({ status: "ok", model: "qwen" })
    expect(result.ready).toBe(true)
  })

  test("statusUnset_notReadyWithReason", () => {
    const result = llmAvailabilityFromHealth({ status: "unset" })
    expect(result.ready).toBe(false)
    expect(result.reason).toBe("unset")
  })

  test("statusUnreachable_readyWithReason", () => {
    const result = llmAvailabilityFromHealth({ status: "unreachable", reason: "timeout" })
    expect(result.ready).toBe(true)
    expect(result.reason).toBe("timeout")
  })
})
