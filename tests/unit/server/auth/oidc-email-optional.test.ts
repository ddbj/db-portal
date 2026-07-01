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
const NONCE = "nonce-abc123"

const validation: IdTokenValidation = {
  issuer: ISSUER,
  audience: CLIENT_ID,
  nonce: NONCE,
  now: () => 1_500 * 1000,
}

// Payload without an email claim; email is an optional OIDC claim, so the user
// info carries no email rather than a synthesized placeholder.
const emaillessPayload = (sub: string): Record<string, unknown> => ({
  iss: ISSUER,
  aud: CLIENT_ID,
  exp: 2_000,
  iat: 1_000,
  sub,
  name: "User One",
  nonce: NONCE,
})

describe("extractUserInfo email optionality", () => {
  test("extractUserInfo_noEmailClaim_omitsEmail", () => {
    const idToken = buildIdToken(emaillessPayload("user-1"))

    const info = extractUserInfo(idToken, validation)

    expect(info.email).toBeUndefined()
  })

  test("extractUserInfo_noEmailClaim_keepsSubAndNameOnly", () => {
    const idToken = buildIdToken(emaillessPayload("user-1"))

    const info = extractUserInfo(idToken, validation)

    expect(info).toEqual({ sub: "user-1", name: "User One" })
  })

  test("extractUserInfo_emptyStringEmailClaim_throwsValidationError", () => {
    // A present-but-empty email claim is rejected by IdTokenPayloadSchema
    // (.email()); only an absent claim is treated as "no email".
    const idToken = buildIdToken({ ...emaillessPayload("user-1"), email: "" })

    expect(() => extractUserInfo(idToken, validation)).toThrow(IdTokenValidationError)
  })

  test("extractUserInfo_noEmail_passesSessionEntryParse", () => {
    const sub = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
    const idToken = buildIdToken(emaillessPayload(sub))

    const info = extractUserInfo(idToken, validation)

    const result = SessionEntry.safeParse({
      tokens: { idToken },
      userInfo: info,
      createdAt: 1_500,
      expiresAt: 1_700,
    })

    expect(result.success).toBe(true)
  })

  test("extractUserInfo_emailClaimPresent_returnsRealEmail", () => {
    const idToken = buildIdToken({ ...emaillessPayload("user-1"), email: "real@example.com" })

    const info = extractUserInfo(idToken, validation)

    expect(info.email).toBe("real@example.com")
  })
})
