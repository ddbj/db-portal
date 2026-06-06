import { describe, expect, test } from "vitest"

import { formatDate } from "~/lib/i18n/format-date"

const withTimeZone = (tz: string, fn: () => void): void => {
  const previous = process.env.TZ
  process.env.TZ = tz
  try {
    fn()
  } finally {
    process.env.TZ = previous
  }
}

describe("formatDate", () => {
  test("formatDate_jstOffsetTimestamp_usesTheJstCalendarDay", () => {
    // A +09:00 timestamp's intended day is its JST day (the news feed's offset).
    expect(formatDate("2026-05-20T00:00:00+09:00")).toBe("2026/05/20")
  })

  test("formatDate_lateUtcInstant_rollsForwardToJstDay", () => {
    // 23:30Z is 08:30 the next day in JST; the JST day is the 26th regardless of
    // the runtime timezone.
    withTimeZone("Asia/Tokyo", () => {
      expect(formatDate("2026-05-25T23:30:00Z")).toBe("2026/05/26")
    })
    withTimeZone("America/Los_Angeles", () => {
      expect(formatDate("2026-05-25T23:30:00Z")).toBe("2026/05/26")
    })
  })

  test("formatDate_utcMidnight_isSameJstDay", () => {
    // 00:00Z is 09:00 JST the same day, regardless of the runtime timezone.
    withTimeZone("America/Los_Angeles", () => {
      expect(formatDate("2026-05-25T00:00:00Z")).toBe("2026/05/25")
    })
  })

  test("formatDate_invalidInput_returnsInputUnchanged", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date")
  })
})
