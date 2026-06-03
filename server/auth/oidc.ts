import crypto from "node:crypto"

import { z } from "zod"

export type OidcConfig = {
  realmUrl: string
  clientId: string
  redirectUri: string
  fetchImpl?: typeof fetch
}

type Tokens = {
  idToken: string
}

type UserInfo = {
  sub: string
  name: string
  email: string
}

const TokenResponseSchema = z.object({
  id_token: z.string().min(1).optional(),
})

const IdTokenPayloadSchema = z.object({
  iss: z.string().min(1),
  aud: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  sub: z.string().min(1),
  name: z.string().min(1).optional(),
  preferred_username: z.string().min(1).optional(),
  given_name: z.string().min(1).optional(),
  family_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
})

export class IdTokenValidationError extends Error {
  readonly reason: string
  constructor(reason: string) {
    super(`id_token validation failed: ${reason}`)
    this.name = "IdTokenValidationError"
    this.reason = reason
  }
}

export type IdTokenValidation = {
  issuer: string
  audience: string
  clockSkewSeconds?: number
  now?: () => number
}

const base64UrlEncode = (buffer: Buffer): string =>
  buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

const base64UrlDecodeToString = (segment: string): string => {
  const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=")
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/")

  return Buffer.from(normalized, "base64").toString("utf8")
}

export const generatePkce = (): { codeVerifier: string; codeChallenge: string } => {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32))
  const codeChallenge = base64UrlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  )

  return { codeVerifier, codeChallenge }
}

export const generateState = (): string => base64UrlEncode(crypto.randomBytes(16))

export const buildAuthorizeUrl = (
  config: OidcConfig,
  state: string,
  codeChallenge: string,
): string => {
  const url = new URL(`${config.realmUrl}/protocol/openid-connect/auth`)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid profile email")
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")

  return url.toString()
}

const callTokenEndpoint = async (
  config: OidcConfig,
  body: URLSearchParams,
): Promise<Tokens> => {
  const fetcher = config.fetchImpl ?? fetch
  const response = await fetcher(`${config.realmUrl}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  if (!response.ok) {
    throw new Error(`token endpoint failed with status ${response.status}`)
  }
  const json: unknown = await response.json()
  const parsed = TokenResponseSchema.parse(json)
  if (!parsed.id_token) {
    throw new Error("token endpoint did not return id_token")
  }

  return { idToken: parsed.id_token }
}

export const exchangeCodeForTokens = async (
  config: OidcConfig,
  code: string,
  codeVerifier: string,
): Promise<Tokens> => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  })

  return callTokenEndpoint(config, body)
}

export const buildLogoutUrl = (
  config: OidcConfig,
  idTokenHint: string,
  postLogoutRedirectUri: string,
): string => {
  const url = new URL(`${config.realmUrl}/protocol/openid-connect/logout`)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("id_token_hint", idTokenHint)
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri)

  return url.toString()
}

export const extractUserInfo = (idToken: string, validation: IdTokenValidation): UserInfo => {
  const segments = idToken.split(".")
  const payloadSegment = segments[1]
  if (segments.length !== 3 || !payloadSegment) {
    throw new IdTokenValidationError("not a JWT")
  }
  let raw: unknown
  try {
    raw = JSON.parse(base64UrlDecodeToString(payloadSegment))
  } catch {
    throw new IdTokenValidationError("payload is not valid JSON")
  }
  const parsedResult = IdTokenPayloadSchema.safeParse(raw)
  if (!parsedResult.success) {
    throw new IdTokenValidationError(`payload schema mismatch: ${parsedResult.error.message}`)
  }
  const parsed = parsedResult.data
  if (parsed.iss !== validation.issuer) {
    throw new IdTokenValidationError("iss mismatch")
  }
  const audiences = Array.isArray(parsed.aud) ? parsed.aud : [parsed.aud]
  if (!audiences.includes(validation.audience)) {
    throw new IdTokenValidationError("aud mismatch")
  }
  const nowSeconds = Math.floor((validation.now?.() ?? Date.now()) / 1000)
  const clockSkew = validation.clockSkewSeconds ?? 60
  if (parsed.exp <= nowSeconds) {
    throw new IdTokenValidationError("token expired")
  }
  if (parsed.iat > nowSeconds + clockSkew) {
    throw new IdTokenValidationError("iat is in the future")
  }
  const combinedName = [parsed.given_name, parsed.family_name]
    .filter((v): v is string => Boolean(v))
    .join(" ")
    .trim()
  const name = parsed.name
    ?? (combinedName !== "" ? combinedName : undefined)
    ?? parsed.preferred_username
    ?? parsed.sub
  const email = parsed.email ?? `${parsed.sub}@example.invalid`

  return { sub: parsed.sub, name, email }
}
