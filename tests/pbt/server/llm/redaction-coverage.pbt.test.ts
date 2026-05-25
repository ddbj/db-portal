import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { redactUserInput } from "../../../../server/llm/redaction"

const arbEmail = fc.tuple(
  fc.stringMatching(/^[a-zA-Z0-9._%+-]{1,15}$/),
  fc.stringMatching(/^[a-zA-Z0-9-]{1,15}$/),
  fc.constantFrom("com", "org", "jp", "ne.jp"),
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

const arbSafeWord = fc.stringMatching(/^[a-zA-Z]{1,15}$/)
const arbSafeText = fc.array(arbSafeWord, { minLength: 1, maxLength: 6 })
  .map((words) => words.join(" "))

describe("redactUserInput PBT", () => {
  test.prop([arbEmail, arbSafeText, arbSafeText])(
    "redactionCoverage_emailInText_alwaysReplacedAndOriginalRemoved",
    (email, before, after) => {
      const input = `${before} ${email} ${after}`
      const output = redactUserInput(input)
      expect(output).toContain("[REDACTED_EMAIL]")
      expect(output).not.toContain(email)
    },
  )

  test.prop([arbSafeText])(
    "redactionCoverage_piiFreeText_isUnchanged",
    (text) => {
      expect(redactUserInput(text)).toBe(text)
    },
  )

  test.prop([arbSafeText])(
    "redactionCoverage_alreadyRedacted_isIdempotent",
    (text) => {
      const once = redactUserInput(text)
      expect(redactUserInput(once)).toBe(once)
    },
  )
})
