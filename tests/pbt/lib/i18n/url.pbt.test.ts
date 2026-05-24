import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { getCounterpartUrl } from "~/lib/i18n/url"

const safeSegment = fc.stringMatching(/^[a-zA-Z0-9_-]{0,8}$/)

const jaPath = fc.array(safeSegment, { minLength: 0, maxLength: 4 }).map((segments) => {
  const joined = segments.filter((s) => s.length > 0).join("/")

  return joined === "" ? "/" : `/${joined}`
}).filter((p) => !(p === "/en" || p.startsWith("/en/")))

const enPath = fc.array(safeSegment, { minLength: 0, maxLength: 4 }).map((segments) => {
  const joined = segments.filter((s) => s.length > 0).join("/")

  return joined === "" ? "/en" : `/en/${joined}`
})

describe("getCounterpartUrl PBT", () => {
  test.prop([jaPath], { numRuns: 200 })(
    "getCounterpartUrl_jaThenEnThenJa_returnsOriginalJaPath",
    (path) => {
      const en = getCounterpartUrl(path, "en")
      const back = getCounterpartUrl(en, "ja")
      expect(back).toBe(path)
    },
  )

  test.prop([enPath], { numRuns: 200 })(
    "getCounterpartUrl_enThenJaThenEn_returnsOriginalEnPath",
    (path) => {
      const ja = getCounterpartUrl(path, "ja")
      const back = getCounterpartUrl(ja, "en")
      expect(back).toBe(path)
    },
  )

  test.prop([jaPath], { numRuns: 200 })(
    "getCounterpartUrl_toEn_alwaysStartsWithEnPrefix",
    (path) => {
      const en = getCounterpartUrl(path, "en")
      expect(en === "/en" || en.startsWith("/en/")).toBe(true)
    },
  )

  test.prop([enPath], { numRuns: 200 })(
    "getCounterpartUrl_toJa_neverStartsWithEnPrefix",
    (path) => {
      const ja = getCounterpartUrl(path, "ja")
      expect(ja === "/en" || ja.startsWith("/en/")).toBe(false)
    },
  )
})
