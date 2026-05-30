import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { buildTitle } from "~/lib/content"

const BRAND = "BSI"
const SEP = " | "

// Labels never contain the separator, so split(" | ") round-trips cleanly.
const arbLabel = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,11}$/)
const arbSegments = fc.array(arbLabel, { maxLength: 6 })
const arbNonEmptySegments = fc.array(arbLabel, { minLength: 1, maxLength: 6 })

describe("buildTitle PBT", () => {
  test.prop([arbSegments], { numRuns: 500 })(
    "buildTitle_anySegments_endsWithBrand",
    (segments) => {
      expect(buildTitle(segments).split(SEP).at(-1)).toBe(BRAND)
    },
  )

  test.prop([arbSegments], { numRuns: 500 })(
    "buildTitle_anySegments_separatorCountEqualsSegmentCount",
    (segments) => {
      const separators = buildTitle(segments).match(/ \| /g) ?? []
      expect(separators.length).toBe(segments.length)
    },
  )

  test.prop([arbNonEmptySegments], { numRuns: 500 })(
    "buildTitle_nonEmptySegments_firstPartIsLeaf",
    (segments) => {
      expect(buildTitle(segments).split(SEP)[0]).toBe(segments[segments.length - 1])
    },
  )

  test.prop([arbSegments], { numRuns: 500 })(
    "buildTitle_anySegments_splitIsInputReversedPlusBrand",
    (segments) => {
      const expected = [...segments].reverse().concat(BRAND)
      expect(buildTitle(segments).split(SEP)).toEqual(expected)
    },
  )
})
