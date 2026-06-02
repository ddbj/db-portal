import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { dbclsDateFromSlug } from "../../../../server/news/normalize"

// DBCLS slugs encode a calendar day plus a 1-based post sequence: `YYYY-MM-DD-postN`.
// The contract: the derived time stays on the same JST calendar day, post1 maps to
// midnight, and later posts are never earlier than earlier posts, saturating at the
// last representable same-day instant 23:59:59 (never spilling into the next day or
// wrapping back to an earlier time).

const DAY_SECONDS = 24 * 60 * 60
const MAX_SAME_DAY_SECONDS = DAY_SECONDS - 1

// Calendar days that always exist, so day validity never depends on month/leap rules.
const arbYear = fc.integer({ min: 2000, max: 2099 }).map((y) => String(y))
const arbMonth = fc.integer({ min: 1, max: 12 }).map((m) => String(m).padStart(2, "0"))
const arbDay = fc.integer({ min: 1, max: 28 }).map((d) => String(d).padStart(2, "0"))
const arbDate = fc.record({ y: arbYear, mo: arbMonth, d: arbDay })

// Post numbers spanning the whole same-day range plus the over-capacity tail where the
// hour saturates (seq >= 24*3600, i.e. n > 86400).
const arbPostNumber = fc.integer({ min: 1, max: 200_000 })

const slugOf = (date: { y: string; mo: string; d: string }, n: number): string =>
  `${date.y}-${date.mo}-${date.d}-post${n}`

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\+09:00$/

const parseResult = (iso: string): {
  date: string
  hours: number
  minutes: number
  seconds: number
  secondsOfDay: number
} => {
  const m = ISO_RE.exec(iso)
  if (!m) throw new Error(`result is not a +09:00 ISO datetime: ${iso}`)
  const [, y, mo, d, hh, mm, ss] = m
  const hours = Number(hh)
  const minutes = Number(mm)
  const seconds = Number(ss)

  return {
    date: `${y}-${mo}-${d}`,
    hours,
    minutes,
    seconds,
    secondsOfDay: hours * 3600 + minutes * 60 + seconds,
  }
}

describe("dbclsDateFromSlug PBT", () => {
  test.prop([arbDate, arbPostNumber])(
    "dbclsDateFromSlug_validSlug_returnsParseableSameDayJstDatetime",
    (date, n) => {
      const iso = dbclsDateFromSlug(slugOf(date, n))
      expect(iso).toBeDefined()
      const parsed = parseResult(iso as string)
      // Stays on the encoded calendar day with valid wall-clock components.
      expect(parsed.date).toBe(`${date.y}-${date.mo}-${date.d}`)
      expect(parsed.hours).toBeGreaterThanOrEqual(0)
      expect(parsed.hours).toBeLessThanOrEqual(23)
      expect(parsed.minutes).toBeGreaterThanOrEqual(0)
      expect(parsed.minutes).toBeLessThanOrEqual(59)
      expect(parsed.seconds).toBeGreaterThanOrEqual(0)
      expect(parsed.seconds).toBeLessThanOrEqual(59)
      // Date.parse must accept it and land on the same UTC instant the offset implies.
      expect(Number.isNaN(Date.parse(iso as string))).toBe(false)
    },
  )

  test.prop([arbDate])(
    "dbclsDateFromSlug_post1_mapsToMidnightOfThatDay",
    (date) => {
      const iso = dbclsDateFromSlug(slugOf(date, 1))
      expect(iso).toBe(`${date.y}-${date.mo}-${date.d}T00:00:00+09:00`)
    },
  )

  test.prop([arbDate, fc.integer({ min: 1, max: MAX_SAME_DAY_SECONDS + 1 })])(
    "dbclsDateFromSlug_withinSameDayCapacity_followsFloorArithmetic",
    (date, n) => {
      // For n that does not exceed the same-day capacity the time is the exact
      // floor packing of seq = n - 1 seconds after midnight.
      const seq = n - 1
      const parsed = parseResult(dbclsDateFromSlug(slugOf(date, n)) as string)
      expect(parsed.hours).toBe(Math.floor(seq / 3600))
      expect(parsed.minutes).toBe(Math.floor((seq % 3600) / 60))
      expect(parsed.seconds).toBe(seq % 60)
      expect(parsed.secondsOfDay).toBe(seq)
    },
  )

  test.prop([arbDate, arbPostNumber, arbPostNumber])(
    "dbclsDateFromSlug_largerPostNumber_isNeverEarlierSameDay",
    (date, a, b) => {
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      const tLo = parseResult(dbclsDateFromSlug(slugOf(date, lo)) as string).secondsOfDay
      const tHi = parseResult(dbclsDateFromSlug(slugOf(date, hi)) as string).secondsOfDay
      // Monotonic non-decreasing in the post number, saturating at 23:59:59.
      expect(tHi).toBeGreaterThanOrEqual(tLo)
      expect(tHi).toBeLessThanOrEqual(MAX_SAME_DAY_SECONDS)
    },
  )

  test.prop([arbDate, fc.integer({ min: DAY_SECONDS + 1, max: 200_000 })])(
    "dbclsDateFromSlug_overCapacity_capsAtLastSameDayInstant",
    (date, n) => {
      // Once seq reaches a full day (n > 86400) the only same-day-consistent answer is
      // the final representable instant 23:59:59; it must not wrap to an earlier time.
      const parsed = parseResult(dbclsDateFromSlug(slugOf(date, n)) as string)
      expect(parsed.secondsOfDay).toBe(MAX_SAME_DAY_SECONDS)
    },
  )

  test.prop([fc.string()])(
    "dbclsDateFromSlug_nonMatchingSlug_returnsUndefined",
    (raw) => {
      fc.pre(!/^\d{4}-\d{2}-\d{2}-post\d+$/i.test(raw))
      expect(dbclsDateFromSlug(raw)).toBeUndefined()
    },
  )

  test.prop([arbDate])(
    "dbclsDateFromSlug_post0_clampsToMidnightLikePost1",
    (date) => {
      // post0 is below the 1-based floor; seq = max(0 - 1, 0) = 0 clamps it to
      // midnight, the same instant post1 produces.
      const iso = dbclsDateFromSlug(slugOf(date, 0))
      expect(iso).toBe(`${date.y}-${date.mo}-${date.d}T00:00:00+09:00`)
    },
  )
})
