import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { redactUserInput } from "../../../../server/llm/redaction"

const PHONE_PLACEHOLDER = "[REDACTED_PHONE]"

// Alphabetic-only filler so the surrounding text carries no digits that could
// merge with the embedded subject and shift redaction boundaries.
const arbSafeWord = fc.stringMatching(/^[A-Za-z]{1,12}$/)
const arbSafeText = fc.array(arbSafeWord, { minLength: 1, maxLength: 5 })
  .map((words) => words.join(" "))

const sep = fc.constantFrom("-", " ")

// JP / international phone numbers with >= 9 significant digits, the threshold
// at which redactUserInput treats a digit run as a phone number.
const arbJpMobile = fc.tuple(
  fc.constantFrom("070", "080", "090"),
  fc.stringMatching(/^[0-9]{4}$/),
  fc.stringMatching(/^[0-9]{4}$/),
  sep,
).map(([head, mid, tail, s]) => `${head}${s}${mid}${s}${tail}`)

const arbJpLandline = fc.tuple(
  fc.constantFrom("03", "06", "011", "052"),
  fc.stringMatching(/^[0-9]{4}$/),
  fc.stringMatching(/^[0-9]{4}$/),
  sep,
).map(([area, mid, tail, s]) => `${area}${s}${mid}${s}${tail}`)

const arbJpTollFree = fc.tuple(
  fc.stringMatching(/^[0-9]{3}$/),
  fc.stringMatching(/^[0-9]{3}$/),
  sep,
).map(([mid, tail, s]) => `0120${s}${mid}${s}${tail}`)

// International form: country code, area code, local. A single-digit area code
// (e.g. Tokyo "+81 3 ...") is a real-world layout that the contract must cover.
const arbIntlPhone = fc.tuple(
  fc.constantFrom("1", "44", "81", "33", "86"),
  fc.constantFrom("3", "20", "90", "212"),
  fc.stringMatching(/^[0-9]{4}$/),
  fc.stringMatching(/^[0-9]{3,4}$/),
  sep,
).map(([cc, area, mid, tail, s]) => `+${cc}${s}${area}${s}${mid}${s}${tail}`)

const arbPhone = fc.oneof(arbJpMobile, arbJpLandline, arbJpTollFree, arbIntlPhone)

// "YYYY-MM-DD" is 8 digits, below the phone threshold, so it must survive.
const arbIsoDate = fc.tuple(
  fc.integer({ min: 1900, max: 2099 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }),
).map(([y, m, d]) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
)

// Accession-style identifier with fewer than 9 digits, e.g. "PRJDB12345".
const arbAccession = fc.tuple(
  fc.constantFrom("PRJDB", "PRJEB", "PRJNA", "SAMD", "DRR", "DRX"),
  fc.stringMatching(/^[0-9]{1,8}$/),
).map(([prefix, num]) => `${prefix}${num}`)

const digitsOf = (text: string): string => text.replace(/\D/g, "")

describe("redactUserInput phone redaction invariants", () => {
  test.prop([arbPhone, arbSafeText, arbSafeText], { numRuns: 1000 })(
    "redactPhone_embeddedInSafeText_replacesPlaceholderAndRemovesRawDigits",
    (phone, before, after) => {
      const input = `${before} ${phone} ${after}`
      const output = redactUserInput(input)

      // Positive coverage: the phone is recognised and a placeholder appears.
      expect(output).toContain(PHONE_PLACEHOLDER)
      // No-leak: the original phone's verbatim form is gone, and none of its
      // significant digits survive in the redacted output. Surrounding filler
      // is alphabetic, so any leftover digit must originate from the phone.
      expect(output).not.toContain(phone)
      expect(digitsOf(output)).toBe("")
    },
  )

  test.prop([arbIsoDate, arbSafeText, arbSafeText], { numRuns: 1000 })(
    "redactPhone_isoDateInSafeText_leavesDateUnchanged",
    (date, before, after) => {
      const input = `${before} ${date} ${after}`
      const output = redactUserInput(input)

      expect(output).toBe(input)
      expect(output).not.toContain(PHONE_PLACEHOLDER)
    },
  )

  test.prop([arbAccession, arbSafeText, arbSafeText], { numRuns: 1000 })(
    "redactPhone_accessionIdInSafeText_leavesIdUnchanged",
    (accession, before, after) => {
      const input = `${before} ${accession} ${after}`
      const output = redactUserInput(input)

      expect(output).toBe(input)
      expect(output).not.toContain(PHONE_PLACEHOLDER)
    },
  )

  test.prop([arbIsoDate], { numRuns: 1000 })(
    "redactPhone_loneIsoDate_isUntouched",
    (date) => {
      expect(redactUserInput(date)).toBe(date)
    },
  )

  test.prop([arbAccession], { numRuns: 1000 })(
    "redactPhone_loneAccessionId_isUntouched",
    (accession) => {
      expect(redactUserInput(accession)).toBe(accession)
    },
  )
})
