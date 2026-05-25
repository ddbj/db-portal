import { describe, expect, test } from "vitest"

import { redactUserInput } from "../../../../server/llm/redaction"

describe("redactUserInput", () => {
  test("redactUserInput_email_replacedWithEmailToken", () => {
    expect(redactUserInput("contact me at foo@example.com please"))
      .toBe("contact me at [REDACTED_EMAIL] please")
  })

  test("redactUserInput_phoneNumber_replacedWithPhoneToken", () => {
    expect(redactUserInput("call me at 090-1234-5678"))
      .toContain("[REDACTED_PHONE]")
  })

  test("redactUserInput_validLuhnCard_replacedWithCardToken", () => {
    expect(redactUserInput("card 4111 1111 1111 1111"))
      .toContain("[REDACTED_CCNUM]")
  })

  test("redactUserInput_nonLuhn16DigitNumber_isNotRedactedAsCard", () => {
    expect(redactUserInput("count 1234567890123456"))
      .not.toContain("[REDACTED_CCNUM]")
  })

  test("redactUserInput_apiKeyToken_replacedWithTokenMarker", () => {
    expect(redactUserInput("token sk-abcdefghijklmnopqrstuvwxyz0123"))
      .toContain("[REDACTED_TOKEN]")
  })

  test.each([
    "human breast cancer 2024 datasets",
    "hello @username is here",
    "twelve-letter hyphenated-word stays intact",
    "Unicode 🧬 emoji passes through",
    "fullwidth ＠username should not match email",
    "RNA-seq 2024-05-25 datasets",
  ])("redactUserInput_safeInput_%# isUnchanged", (input) => {
    expect(redactUserInput(input)).toBe(input)
  })

  test("redactUserInput_multipleEmails_allRedacted", () => {
    const input = "send to alice@example.com and bob@example.org"
    const out = redactUserInput(input)
    expect(out.match(/REDACTED_EMAIL/g)?.length).toBe(2)
    expect(out).not.toContain("alice@example.com")
    expect(out).not.toContain("bob@example.org")
  })
})
