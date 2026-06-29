import { describe, expect, test } from "vitest"

import { buildLoginUrl, buildLogoutUrl } from "~/lib/auth/login-url"

describe("buildLoginUrl", () => {
  test("buildLoginUrl_noReturnTo_returnsBasePath", () => {
    expect(buildLoginUrl()).toBe("/api/auth/login")
  })

  test("buildLoginUrl_returnTo_appendsEncodedParam", () => {
    expect(buildLoginUrl("/bioproject")).toBe(
      "/api/auth/login?return_to=%2Fbioproject",
    )
  })

  test("buildLoginUrl_returnToWithQuery_preservesQueryString", () => {
    expect(buildLoginUrl("/search/results?q=cancer&db=sra")).toBe(
      "/api/auth/login?return_to=%2Fsearch%2Fresults%3Fq%3Dcancer%26db%3Dsra",
    )
  })
})

describe("buildLogoutUrl", () => {
  test("buildLogoutUrl_noReturnTo_returnsBasePath", () => {
    expect(buildLogoutUrl()).toBe("/api/auth/logout")
  })

  test("buildLogoutUrl_returnTo_appendsEncodedParam", () => {
    expect(buildLogoutUrl("/en/bioproject")).toBe(
      "/api/auth/logout?return_to=%2Fen%2Fbioproject",
    )
  })
})

describe("buildLoginUrl returnTo sanitization", () => {
  test("buildLoginUrl_protocolRelativeUrl_replacedWithRoot", () => {
    expect(buildLoginUrl("//evil.example.test/")).toBe("/api/auth/login?return_to=%2F")
  })

  test("buildLoginUrl_absoluteHttpsUrl_replacedWithRoot", () => {
    expect(buildLoginUrl("https://evil.example.test/x")).toBe("/api/auth/login?return_to=%2F")
  })

  test("buildLoginUrl_backslashProtocolRelative_replacedWithRoot", () => {
    expect(buildLoginUrl("/\\evil.example.test/")).toBe("/api/auth/login?return_to=%2F")
  })

  test("buildLoginUrl_emptyString_replacedWithRoot", () => {
    expect(buildLoginUrl("")).toBe("/api/auth/login?return_to=%2F")
  })

  test("buildLoginUrl_relativeWithoutSlash_replacedWithRoot", () => {
    expect(buildLoginUrl("bioproject")).toBe("/api/auth/login?return_to=%2F")
  })
})
