import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { isSessionPath } from "../../../../server/lib/compression"

// Spells a segment with random letter case, as Express matches routes
// case-insensitively.
const arbRandomCase = (segment: string) =>
  fc.array(fc.boolean(), { minLength: segment.length, maxLength: segment.length }).map((upper) =>
    [...segment].map((ch, i) => (upper[i] ? ch.toUpperCase() : ch)).join(""))

const arbSegment = fc.stringMatching(/^[A-Za-z0-9._~-]{0,8}$/)

const arbTail = fc.oneof(
  fc.constant(""),
  fc.constant("/"),
  fc.array(arbSegment, { minLength: 1, maxLength: 3 }).map((segments) => `/${segments.join("/")}`),
)

const arbPath = fc.oneof(
  fc.tuple(fc.constantFrom("me", "auth"), arbTail).chain(([name, tail]) =>
    arbRandomCase(`/api/${name}`).map((head) => `${head}${tail}`)),
  fc.tuple(arbSegment, arbTail).map(([segment, tail]) => `/api/${segment}${tail}`),
  fc.array(arbSegment, { minLength: 0, maxLength: 4 }).map((segments) => `/${segments.join("/")}`),
)

const expected = (path: string): boolean => {
  const lower = path.toLowerCase()

  return ["/api/me", "/api/auth"].some((base) => lower === base || lower.startsWith(`${base}/`))
}

describe("isSessionPath PBT", () => {
  test.prop([arbPath], { numRuns: 500 })("isSessionPath_anyPath_matchesSessionPrefixCaseInsensitively", (path) => {
    expect(isSessionPath(path)).toBe(expected(path))
  })
})
