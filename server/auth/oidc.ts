import crypto from "node:crypto"

import * as jose from "jose"
import { z } from "zod"

export type OidcConfig = {
  realmUrl: string
  clientId: string
  redirectUri: string
  fetchImpl?: typeof fetch
}

const TOKEN_ENDPOINT_TIMEOUT_MS = 10_000

export type JwksResolver = jose.JWTVerifyGetKey

// Keycloak の JWKS endpoint を lazy に fetch する resolver。 rotation 時は
// jose が cache miss を検出して自動再取得するので、 呼び出し側は resolver を
// 使い回すだけで良い。
export const createRealmJwks = (realmUrl: string): JwksResolver =>
  jose.createRemoteJWKSet(new URL(`${realmUrl}/protocol/openid-connect/certs`))

export type SignatureVerificationSpec = {
  jwks: JwksResolver
  issuer: string
  audience: string
  clockSkewSeconds?: number
}

type Tokens = {
  idToken: string
}

type UserInfo = {
  sub: string
  name: string
  email?: string
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
  nonce: z.string().min(1).optional(),
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
  // The nonce minted for this authorization request; the id_token's `nonce` claim
  // must echo it, binding the token to this specific login (PKCE protects the code
  // exchange, the nonce protects the token against replay/substitution).
  nonce: string
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

export const generateNonce = (): string => base64UrlEncode(crypto.randomBytes(16))

export const buildAuthorizeUrl = (
  config: OidcConfig,
  state: string,
  codeChallenge: string,
  nonce: string,
): string => {
  const url = new URL(`${config.realmUrl}/protocol/openid-connect/auth`)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", config.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid profile email")
  url.searchParams.set("state", state)
  url.searchParams.set("nonce", nonce)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")

  return url.toString()
}

const callTokenEndpoint = async (
  config: OidcConfig,
  body: URLSearchParams,
): Promise<Tokens> => {
  const fetcher = config.fetchImpl ?? fetch
  // Slow / hung Keycloak が callback を無限に stall させるのを防ぐ hard timeout。
  // これが無いと単一 attacker が worker + pending-logins slot を pin して
  // 通常 login を DoS できる。 AbortSignal を fetch に渡す形は jsdom + undici
  // の cross-realm instance check に引っかかるため、 Promise.race で app 層に
  // hard cap を持たせる (socket は残るが Node の keep-alive TTL で回収される)。
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`token endpoint timeout after ${TOKEN_ENDPOINT_TIMEOUT_MS}ms`)),
      TOKEN_ENDPOINT_TIMEOUT_MS,
    )
  })
  try {
    const response = await Promise.race([
      fetcher(`${config.realmUrl}/protocol/openid-connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }),
      timeoutPromise,
    ])
    if (!response.ok) {
      throw new Error(`token endpoint failed with status ${response.status}`)
    }
    const json: unknown = await response.json()
    const parsed = TokenResponseSchema.parse(json)
    if (!parsed.id_token) {
      throw new Error("token endpoint did not return id_token")
    }

    return { idToken: parsed.id_token }
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
  }
}

export type SignatureVerifier = (
  idToken: string,
  spec: Pick<SignatureVerificationSpec, "issuer" | "audience" | "clockSkewSeconds">,
) => Promise<void>

// PKCE / state / nonce は authorization flow の順序を守る仕組み。 realm 鍵で
// id_token の署名を検証しないと、 TLS の integrity だけが真正性の根拠になる
// (misconfigured proxy や dev の rogue CA を経由すると任意の sub で session
// 発行が通ってしまう)。 verify 失敗は既存の IdTokenValidationError 経路に
// 折り畳んで route 側の分岐を保つ。 factory を通すのは test が実 JWKS を叩けない
// ため DI で bypass する必要があるから。
export const buildSignatureVerifier = (jwks: JwksResolver): SignatureVerifier =>
  async (idToken, spec) => {
    try {
      await jose.jwtVerify(idToken, jwks, {
        issuer: spec.issuer,
        audience: spec.audience,
        clockTolerance: spec.clockSkewSeconds ?? 60,
      })
    } catch (e) {
      const reason = e instanceof Error ? e.message : "verify failed"
      throw new IdTokenValidationError(`signature: ${reason}`)
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
  if (parsed.nonce !== validation.nonce) {
    throw new IdTokenValidationError("nonce mismatch")
  }
  const nowSeconds = Math.floor((validation.now?.() ?? Date.now()) / 1000)
  const clockSkew = validation.clockSkewSeconds ?? 60
  // clockSkew は両側に対称適用する。 BFF host 時計が Keycloak より進んでいる
  // 場合に短寿命 id_token が発行直後に「expired」 と誤判定されるのを防ぐ。
  if (parsed.exp + clockSkew <= nowSeconds) {
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
  const email = parsed.email

  return { sub: parsed.sub, name, ...(email !== undefined ? { email } : {}) }
}
