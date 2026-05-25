import { describe, expect, test } from "vitest"

import {
  extractUserInfo,
  type IdTokenValidation,
  IdTokenValidationError,
} from "../../../../server/auth/oidc"

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

const buildIdToken = (payload: Record<string, unknown>): string => {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const body = base64UrlEncode(JSON.stringify(payload))
  return `${header}.${body}.signature-placeholder`
}

const ISSUER = "https://idp.example.com/realms/master"
const CLIENT_ID = "db-portal"

const validation = (now: number): IdTokenValidation => ({
  issuer: ISSUER,
  audience: CLIENT_ID,
  now: () => now * 1000,
})

const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  iss: ISSUER,
  aud: CLIENT_ID,
  exp: 2_000,
  iat: 1_000,
  sub: "user-1",
  email: "user@example.com",
  name: "User One",
  ...overrides,
})

describe("extractUserInfo", () => {
  test("ExtractUserInfo_validPayload_returnsUserInfo", () => {
    const idToken = buildIdToken(validPayload())
    const info = extractUserInfo(idToken, validation(1_500))
    expect(info).toEqual({ sub: "user-1", name: "User One", email: "user@example.com" })
  })

  test("ExtractUserInfo_audAsArray_acceptsWhenClientIncluded", () => {
    const idToken = buildIdToken(validPayload({ aud: ["another-client", CLIENT_ID] }))
    const info = extractUserInfo(idToken, validation(1_500))
    expect(info.sub).toBe("user-1")
  })

  test("ExtractUserInfo_issMismatch_throwsValidationError", () => {
    const idToken = buildIdToken(validPayload({ iss: "https://attacker.example/realms/master" }))
    expect(() => extractUserInfo(idToken, validation(1_500))).toThrow(IdTokenValidationError)
  })

  test("ExtractUserInfo_audMismatch_throwsValidationError", () => {
    const idToken = buildIdToken(validPayload({ aud: "other-client" }))
    expect(() => extractUserInfo(idToken, validation(1_500))).toThrow(IdTokenValidationError)
  })

  test("ExtractUserInfo_expExpired_throwsValidationError", () => {
    const idToken = buildIdToken(validPayload({ exp: 1_500 }))
    expect(() => extractUserInfo(idToken, validation(2_000))).toThrow(/expired/)
  })

  test("ExtractUserInfo_iatInFuture_throwsValidationError", () => {
    const idToken = buildIdToken(validPayload({ iat: 5_000 }))
    expect(() => extractUserInfo(idToken, validation(1_500))).toThrow(/iat/)
  })

  test("ExtractUserInfo_iatWithinClockSkew_accepts", () => {
    const idToken = buildIdToken(validPayload({ iat: 1_530 }))
    const info = extractUserInfo(idToken, { ...validation(1_500), clockSkewSeconds: 60 })
    expect(info.sub).toBe("user-1")
  })

  test("ExtractUserInfo_notJwt_throwsValidationError", () => {
    expect(() => extractUserInfo("not-a-jwt", validation(1_500))).toThrow(IdTokenValidationError)
  })

  test("ExtractUserInfo_missingSub_throwsValidationError", () => {
    const idToken = buildIdToken(validPayload({ sub: undefined }))
    expect(() => extractUserInfo(idToken, validation(1_500))).toThrow(IdTokenValidationError)
  })

  test("ExtractUserInfo_fallsBackToPreferredUsernameWhenNoName", () => {
    const payload = validPayload({ name: undefined, preferred_username: "user.one" })
    const idToken = buildIdToken(payload)
    const info = extractUserInfo(idToken, validation(1_500))
    expect(info.name).toBe("user.one")
  })

  test("ExtractUserInfo_fallsBackToCombinedNameWhenNoNameOrPreferred", () => {
    const payload = validPayload({
      name: undefined,
      preferred_username: undefined,
      given_name: "Ada",
      family_name: "Lovelace",
    })
    const idToken = buildIdToken(payload)
    const info = extractUserInfo(idToken, validation(1_500))
    expect(info.name).toBe("Ada Lovelace")
  })
})
