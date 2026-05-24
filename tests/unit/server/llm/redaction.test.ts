import { describe, expect, test } from "vitest"

import { redactUserInput } from "../../../../server/llm/redaction"

describe("redactUserInput", () => {
  test("email is redacted", () => {
    expect(redactUserInput("contact me at foo@example.com please"))
      .toBe("contact me at [REDACTED_EMAIL] please")
  })

  test("phone number is redacted", () => {
    expect(redactUserInput("call me at 090-1234-5678"))
      .toContain("[REDACTED_PHONE]")
  })

  test("valid credit card (Luhn-passing) is redacted", () => {
    expect(redactUserInput("card 4111 1111 1111 1111"))
      .toContain("[REDACTED_CCNUM]")
  })

  test("random 16-digit non-Luhn number is not flagged as card", () => {
    expect(redactUserInput("count 1234567890123456"))
      .not.toContain("[REDACTED_CCNUM]")
  })

  test("api key style token is redacted", () => {
    expect(redactUserInput("token sk-abcdefghijklmnopqrstuvwxyz0123"))
      .toContain("[REDACTED_TOKEN]")
  })

  test("safe input is unchanged", () => {
    expect(redactUserInput("human breast cancer 2024 datasets"))
      .toBe("human breast cancer 2024 datasets")
  })

  test("multiple matches in one input are all redacted", () => {
    const input = "send to alice@example.com and bob@example.org"
    const out = redactUserInput(input)
    expect(out.match(/REDACTED_EMAIL/g)?.length).toBe(2)
    expect(out).not.toContain("alice@example.com")
    expect(out).not.toContain("bob@example.org")
  })
})
