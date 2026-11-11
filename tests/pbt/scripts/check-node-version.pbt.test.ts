import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { checkNodeVersion, isAtLeast, type Version } from "../../../scripts/check-node-version"

const arbPart = fc.oneof(fc.nat({ max: 3 }), fc.nat({ max: 1000 }))
const arbVersion: fc.Arbitrary<Version> = fc.tuple(arbPart, arbPart, arbPart)

// Orders versions by a single number. Each part stays below 10^4.
const rank = ([major, minor, patch]: Version): number => major * 1e8 + minor * 1e4 + patch

const format = ([major, minor, patch]: Version): string => `${major}.${minor}.${patch}`

describe("check-node-version PBT", () => {
  test.prop([arbVersion, arbVersion])("isAtLeast_anyPair_matchesNumericOrder", (current, minimum) => {
    expect(isAtLeast(current, minimum)).toBe(rank(current) >= rank(minimum))
  })

  test.prop([arbVersion, arbVersion])("isAtLeast_anyPair_isTotal", (a, b) => {
    expect(isAtLeast(a, b) || isAtLeast(b, a)).toBe(true)
  })

  test.prop([arbVersion, arbVersion])("checkNodeVersion_formattedVersions_agreesWithIsAtLeast", (current, minimum) => {
    expect(checkNodeVersion(format(current), `>=${format(minimum)}`).ok).toBe(isAtLeast(current, minimum))
    expect(checkNodeVersion(`v${format(current)}`, `>=${format(minimum)}`).ok).toBe(isAtLeast(current, minimum))
  })
})
