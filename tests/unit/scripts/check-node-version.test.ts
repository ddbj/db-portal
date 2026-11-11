import { describe, expect, test } from "vitest"

import {
  checkNodeVersion,
  isAtLeast,
  parseMinimum,
  parseNodeVersion,
} from "../../../scripts/check-node-version"

describe("parseMinimum", () => {
  test("parseMinimum_greaterOrEqualWithFullVersion_returnsTuple", () => {
    expect(parseMinimum(">=26.12.1")).toEqual([26, 12, 1])
    expect(parseMinimum(">= 26.12.1")).toEqual([26, 12, 1])
    expect(parseMinimum("  >=26.12.1  ")).toEqual([26, 12, 1])
  })

  test("parseMinimum_otherRangeForms_returnUndefined", () => {
    const ranges = ["^26.12.1", "~26.12.1", "26.12.1", ">=26", ">=26.12", ">26.12.1", ">=26.12.1 <27", "26.x", ">=v26.12.1", ""]
    expect(Object.fromEntries(ranges.map((range) => [range, parseMinimum(range)])))
      .toEqual(Object.fromEntries(ranges.map((range) => [range, undefined])))
  })
})

describe("parseNodeVersion", () => {
  test("parseNodeVersion_releaseWithOrWithoutV_returnsTuple", () => {
    expect(parseNodeVersion("26.13.0")).toEqual([26, 13, 0])
    expect(parseNodeVersion("v26.13.0")).toEqual([26, 13, 0])
  })

  test("parseNodeVersion_prereleaseOrPartial_returnsUndefined", () => {
    const versions = ["26.13.0-nightly2026", "26.13", "26", "", "vv26.13.0"]
    expect(Object.fromEntries(versions.map((version) => [version, parseNodeVersion(version)])))
      .toEqual(Object.fromEntries(versions.map((version) => [version, undefined])))
  })
})

describe("isAtLeast", () => {
  test("isAtLeast_equalVersion_isTrue", () => {
    expect(isAtLeast([26, 12, 1], [26, 12, 1])).toBe(true)
  })

  test("isAtLeast_lowerPatch_isFalse", () => {
    expect(isAtLeast([26, 12, 0], [26, 12, 1])).toBe(false)
  })

  test("isAtLeast_higherMinorWithLowerPatch_isTrue", () => {
    expect(isAtLeast([26, 13, 0], [26, 12, 1])).toBe(true)
  })

  test("isAtLeast_lowerMinorWithHigherPatch_isFalse", () => {
    expect(isAtLeast([26, 11, 9], [26, 12, 1])).toBe(false)
  })

  test("isAtLeast_higherMajor_isTrue", () => {
    expect(isAtLeast([27, 0, 0], [26, 12, 1])).toBe(true)
  })

  test("isAtLeast_lowerMajorWithHigherMinor_isFalse", () => {
    expect(isAtLeast([25, 99, 99], [26, 12, 1])).toBe(false)
  })
})

describe("checkNodeVersion", () => {
  test("checkNodeVersion_currentMeetsMinimum_isOk", () => {
    expect(checkNodeVersion("26.13.0", ">=26.12.1")).toEqual({ ok: true })
  })

  test("checkNodeVersion_currentBelowMinimum_failsWithBothVersions", () => {
    const result = checkNodeVersion("26.12.0", ">=26.12.1")
    expect(result.ok).toBe(false)
    expect(result.ok ? "" : result.message).toContain("26.12.0")
    expect(result.ok ? "" : result.message).toContain(">=26.12.1")
  })

  test("checkNodeVersion_missingOrNonStringEngines_fails", () => {
    for (const engines of [undefined, null, 26, { node: ">=26.12.1" }]) {
      expect(checkNodeVersion("26.13.0", engines).ok).toBe(false)
    }
  })

  test("checkNodeVersion_unsupportedRangeForm_fails", () => {
    expect(checkNodeVersion("26.13.0", "^26.12.1").ok).toBe(false)
  })

  test("checkNodeVersion_unreadableCurrentVersion_fails", () => {
    expect(checkNodeVersion("26.13.0-nightly", ">=26.12.1").ok).toBe(false)
  })
})
