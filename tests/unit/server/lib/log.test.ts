import type { MockInstance } from "vitest"
import { afterEach, describe, expect, test, vi } from "vitest"

import { createLogger } from "../../../../server/lib/log"

type WriteSpy = MockInstance<typeof process.stdout.write>

const spyStdout = (): WriteSpy =>
  vi.spyOn(process.stdout, "write").mockImplementation(() => true)

const parseEntries = (spy: WriteSpy): Record<string, unknown>[] =>
  spy.mock.calls.map((args) => JSON.parse(String(args[0])) as Record<string, unknown>)

describe("createLogger", () => {
  afterEach(() => vi.restoreAllMocks())

  test("Logger_belowThreshold_doesNotWrite", () => {
    const spy = spyStdout()
    const logger = createLogger("warn")
    logger.debug("d")
    logger.info("i")
    expect(spy).not.toHaveBeenCalled()
  })

  test("Logger_aboveThreshold_writesJsonEntry", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.warn("hello", { extra: "value" })
    const entries = parseEntries(spy)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ level: "warn", msg: "hello", extra: "value" })
  })

  test("Logger_redactsFlatTokenKey", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.info("flat", { accessToken: "secret-1", refreshToken: "secret-2" })
    const entries = parseEntries(spy)
    expect(entries[0]).toMatchObject({
      accessToken: "[REDACTED]",
      refreshToken: "[REDACTED]",
    })
  })

  test("Logger_redactsNestedTokenKey", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.info("nested", { tokens: { accessToken: "secret", idToken: "tok" } })
    const entries = parseEntries(spy)
    const fields = entries[0] as Record<string, Record<string, string>>
    expect(fields.tokens).toEqual({ accessToken: "[REDACTED]", idToken: "[REDACTED]" })
  })

  test("Logger_redactsArrayOfObjects", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.info("array", { items: [{ accessToken: "a" }, { accessToken: "b" }] })
    const entries = parseEntries(spy)
    const fields = entries[0] as { items: Record<string, string>[] }
    expect(fields.items).toEqual([{ accessToken: "[REDACTED]" }, { accessToken: "[REDACTED]" }])
  })

  test("Logger_redactsAuthorizationHeader", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.info("req", { headers: { Authorization: "Bearer xyz", "user-agent": "ua" } })
    const entries = parseEntries(spy)
    const fields = entries[0] as { headers: Record<string, string> }
    expect(fields.headers.Authorization).toBe("[REDACTED]")
    expect(fields.headers["user-agent"]).toBe("ua")
  })

  test("Logger_redactsKeyCaseInsensitively", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.info("aliases", { "Set-Cookie": "sid=abc", id_token: "tok", PASSWORD: "p" })
    const entries = parseEntries(spy)
    expect(entries[0]).toMatchObject({
      "Set-Cookie": "[REDACTED]",
      id_token: "[REDACTED]",
      PASSWORD: "[REDACTED]",
    })
  })

  test("Logger_redactsBearerTokenInUnanticipatedKey", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.info("misc", { note: "called with Authorization: Bearer abc.def-123" })
    const entries = parseEntries(spy)
    expect(entries[0]?.note).toBe("called with Authorization: Bearer [REDACTED]")
  })

  test("Logger_redactsJwtValueInUnanticipatedKey", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.sig-nature_123"
    logger.info("misc", { detail: `token=${jwt}` })
    const entries = parseEntries(spy)
    expect(entries[0]?.detail).toBe("token=[REDACTED_JWT]")
  })

  test("Logger_leavesNonObjectScalarsUntouched", () => {
    const spy = spyStdout()
    const logger = createLogger("info")
    logger.info("scalars", { count: 42, ok: true, label: "hello" })
    const entries = parseEntries(spy)
    expect(entries[0]).toMatchObject({ count: 42, ok: true, label: "hello" })
  })
})
