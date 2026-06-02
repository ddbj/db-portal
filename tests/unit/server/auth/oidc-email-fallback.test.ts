import { describe, expect, test } from "vitest"

import {
  extractUserInfo,
  type IdTokenValidation,
  IdTokenValidationError,
} from "../../../../server/auth/oidc"
import { SessionEntry } from "../../../../server/auth/session-store"

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

const validation: IdTokenValidation = {
  issuer: ISSUER,
  audience: CLIENT_ID,
  now: () => 1_500 * 1000,
}

// Payload without an email claim, so extractUserInfo must synthesize one.
const emaillessPayload = (sub: string): Record<string, unknown> => ({
  iss: ISSUER,
  aud: CLIENT_ID,
  exp: 2_000,
  iat: 1_000,
  sub,
  name: "User One",
})

describe("extractUserInfo email fallback", () => {
  test("extractUserInfo_noEmailClaim_synthesizesSubAtExampleInvalid", () => {
    const idToken = buildIdToken(emaillessPayload("user-1"))

    const info = extractUserInfo(idToken, validation)

    expect(info.email).toBe("user-1@example.invalid")
  })

  test("extractUserInfo_noEmailClaim_keepsSubAndName", () => {
    const idToken = buildIdToken(emaillessPayload("user-1"))

    const info = extractUserInfo(idToken, validation)

    expect(info).toEqual({
      sub: "user-1",
      name: "User One",
      email: "user-1@example.invalid",
    })
  })

  test("extractUserInfo_emptyStringEmailClaim_throwsValidationError", () => {
    // The fallback only applies when the email claim is absent. A present but
    // empty email claim is rejected by IdTokenPayloadSchema (.email()) and is
    // not silently replaced by the synthesized address.
    const idToken = buildIdToken({ ...emaillessPayload("user-1"), email: "" })

    expect(() => extractUserInfo(idToken, validation)).toThrow(IdTokenValidationError)
  })

  test("extractUserInfo_uuidSub_synthesizedEmailPassesSessionEntryParse", () => {
    // Keycloak sub is a UUID; the synthesized fallback must satisfy the
    // SessionEntry userInfo .email() constraint.
    const sub = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
    const idToken = buildIdToken(emaillessPayload(sub))

    const info = extractUserInfo(idToken, validation)

    const result = SessionEntry.safeParse({
      tokens: { idToken },
      userInfo: info,
      expiresAt: 1_700,
    })

    expect(result.success).toBe(true)
    expect(info.email).toBe(`${sub}@example.invalid`)
  })

  test("extractUserInfo_dottedSub_synthesizedEmailPassesSessionEntryParse", () => {
    const sub = "first.last-001"
    const idToken = buildIdToken(emaillessPayload(sub))

    const info = extractUserInfo(idToken, validation)

    const result = SessionEntry.safeParse({
      tokens: { idToken },
      userInfo: info,
      expiresAt: 1_700,
    })

    expect(result.success).toBe(true)
  })

  test("extractUserInfo_emailClaimPresent_doesNotUseFallback", () => {
    const idToken = buildIdToken({ ...emaillessPayload("user-1"), email: "real@example.com" })

    const info = extractUserInfo(idToken, validation)

    expect(info.email).toBe("real@example.com")
  })
})
