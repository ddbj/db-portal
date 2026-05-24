import crypto from "node:crypto"

import { z } from "zod"

export type OidcConfig = {
  realmUrl: string
  clientId: string
  redirectUri: string
  fetchImpl?: typeof fetch
}

export type AuthorizeUrlResult = {
  url: string
  state: string
  codeVerifier: string
}

export type Tokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  idToken: string
}

export type UserInfo = {
  sub: string
  name: string
  email: string
}

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  id_token: z.string().min(1).optional(),
})

const IdTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  name: z.string().min(1).optional(),
  preferred_username: z.string().min(1).optional(),
  given_name: z.string().min(1).optional(),
  family_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
})

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

  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    expiresAt: Date.now() + parsed.expires_in * 1000,
    idToken: parsed.id_token,
  }
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

export const refreshTokens = async (
  config: OidcConfig,
  refreshToken: string,
): Promise<Tokens> => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
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

export const extractUserInfo = (idToken: string): UserInfo => {
  const segments = idToken.split(".")
  const payloadSegment = segments[1]
  if (segments.length !== 3 || !payloadSegment) {
    throw new Error("id_token is not a JWT")
  }
  const payload = JSON.parse(base64UrlDecodeToString(payloadSegment)) as unknown
  const parsed = IdTokenPayloadSchema.parse(payload)
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
