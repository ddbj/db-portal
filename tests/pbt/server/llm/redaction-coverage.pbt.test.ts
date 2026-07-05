import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { redactUserInput } from "../../../../server/llm/redaction"

const arbEmail = fc.tuple(
  fc.stringMatching(/^[a-zA-Z0-9._%+-]{1,15}$/),
  fc.stringMatching(/^[a-zA-Z0-9-]{1,15}$/),
  fc.constantFrom("com", "org", "jp", "ne.jp"),
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

const arbJwt = fc.tuple(
  fc.stringMatching(/^eyJ[a-zA-Z0-9_-]{15,30}$/),
  fc.stringMatching(/^[a-zA-Z0-9_-]{15,30}$/),
  fc.stringMatching(/^[a-zA-Z0-9_-]{15,30}$/),
).map(([h, p, s]) => `${h}.${p}.${s}`)

const arbAwsKey = fc.tuple(
  fc.constantFrom("AKIA", "ASIA"),
  fc.stringMatching(/^[0-9A-Z]{16}$/),
).map(([prefix, tail]) => `${prefix}${tail}`)

const arbGoogleKey = fc.stringMatching(/^AIza[0-9A-Za-z_-]{35}$/)

const arbPii = fc.oneof(arbEmail, arbJwt, arbAwsKey, arbGoogleKey)

const arbSafeWord = fc.stringMatching(/^[a-zA-Z]{1,15}$/)
const arbSafeText = fc.array(arbSafeWord, { minLength: 1, maxLength: 6 })
  .map((words) => words.join(" "))

// 実 PII を含む input。 idempotence の property は PII を含む input で
// 実行しないと「入力に何も PII が無いので redact も何もしないだけ」の
// tautological になる。
const arbPiiText = fc.tuple(arbSafeText, arbPii, arbSafeText)
  .map(([b, p, a]) => `${b} ${p} ${a}`)

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

  test.prop([arbPiiText])(
    "redactionCoverage_containsPii_isIdempotent",
    (text) => {
      // 実 PII を含む input で redact を 2 回適用しても結果が変わらないこと。
      // pure safe text の identity は `piiFreeText_isUnchanged` で別途担保する。
      const once = redactUserInput(text)
      const twice = redactUserInput(once)
      expect(twice).toBe(once)
    },
  )
})
