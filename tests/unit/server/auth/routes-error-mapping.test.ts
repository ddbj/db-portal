import type { Request, Response } from "express"
import { Router } from "express"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, test } from "vitest"

import { pendingLogins } from "../../../../server/auth/pending-logins"
import { mountAuthRoutes } from "../../../../server/auth/routes"
import type { ServerEnv } from "../../../../server/lib/env"
import { createLogger } from "../../../../server/lib/log"
import { server } from "../../mocks/server"

const REALM_URL = "https://idp.example.com/realms/master"
const CLIENT_ID = "db-portal"
const PORTAL_ORIGIN = "https://portal.example.com"
const TOKEN_ENDPOINT = `${REALM_URL}/protocol/openid-connect/token`

const env: ServerEnv = {
  DB_PORTAL_ENV: "production",
  DB_PORTAL_APP_INTERNAL_PORT: 3000,
  DB_PORTAL_TRUST_PROXY: "loopback",
  DB_PORTAL_PORTAL_ORIGIN: PORTAL_ORIGIN,
  DB_PORTAL_LOG_LEVEL: "error",
  DB_PORTAL_DEFAULT_LANG: "ja",
  DB_PORTAL_SEARCH_API_URL: "https://search.example.com/api",
  DB_PORTAL_SEARCH_API_TIMEOUT_MS: 10_000,
  DB_PORTAL_OPENAPI_URL: "https://search.example.com/openapi.json",
  DB_PORTAL_KEYCLOAK_REALM_URL: REALM_URL,
  DB_PORTAL_KEYCLOAK_CLIENT_ID: CLIENT_ID,
  DB_PORTAL_AUTH_SESSION_TTL_SECONDS: 1_800,
  DB_PORTAL_LLM_BASE_URL: undefined,
  DB_PORTAL_LLM_API_KEY: undefined,
  DB_PORTAL_LLM_MODEL: "model",
  DB_PORTAL_LLM_TIMEOUT_MS: 60_000,
  DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN: 60,
  DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN: 30,
  DB_PORTAL_NEWS_REPOS_DIR: "./repos",
  DB_PORTAL_NEWS_DDBJ_REPO_URL: "https://github.com/ddbj/www.git",
  DB_PORTAL_NEWS_MIRROR_DDBJ_BRANCH: "main",
  DB_PORTAL_NEWS_DBCLS_REPO_URL: "https://github.com/dbcls/website.git",
  DB_PORTAL_NEWS_MIRROR_DBCLS_BRANCH: "master",
  DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS: 1_800,
  DB_PORTAL_NEWS_CACHE_DIR: "/var/cache/db-portal/news",
  DB_PORTAL_SERVICES_CACHE_DIR: "/var/cache/db-portal/services",
}

type RouteHandler = (req: Request, res: Response) => unknown | Promise<unknown>

type RouterInternals = {
  stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: RouteHandler }[] } }[]
}

// mountAuthRoutes が router に登録した実ハンドラを取り出す。
// 内部実装ではなく登録結果を取得しているだけで、ハンドラ本体は実コードのまま実行する。
// signature verifier は DI で bypass する: test は実 JWKS endpoint を叩けず、
// この test の主眼は payload レベルの iss/aud/nonce/exp 検証と error mapping。
const callbackHandler = (): RouteHandler => {
  const router = Router()
  mountAuthRoutes(router, env, createLogger("error"), {
    signatureVerifier: async () => { /* pass */ },
  })
  const route = (router as unknown as RouterInternals).stack.find(
    (l) => l.route?.path === "/api/auth/callback" && l.route.methods.get,
  )?.route
  if (!route) throw new Error("callback route not registered")
  const last = route.stack[route.stack.length - 1]
  if (!last) throw new Error("callback route has no handler")

  return last.handle
}

type Recorded = {
  status: number | undefined
  body: unknown
  redirect: { status: number; location: string } | undefined
  headers: Record<string, string>
}

const makeRes = (): { res: Response; recorded: Recorded } => {
  const recorded: Recorded = {
    status: undefined,
    body: undefined,
    redirect: undefined,
    headers: {},
  }
  const res = {
    status(code: number) {
      recorded.status = code

      return this
    },
    json(payload: unknown) {
      recorded.body = payload

      return this
    },
    setHeader(name: string, value: string) {
      recorded.headers[name] = value
    },
    redirect(status: number, location: string) {
      recorded.redirect = { status, location }
    },
  } as unknown as Response

  return { res, recorded }
}

const makeReq = (query: Record<string, string>): Request =>
  ({ query, headers: {} }) as unknown as Request

const setCookieHeader = (recorded: Recorded): string | undefined =>
  recorded.headers["Set-Cookie"] ?? recorded.headers["set-cookie"]

const base64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")

const jwt = (payload: Record<string, unknown>): string => {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const body = base64Url(JSON.stringify(payload))

  return `${header}.${body}.signature-placeholder`
}

let stateCounter = 0
const PENDING_NONCE = "nonce-fixed"
// callback は pendingLogins を消費して state を検証する。
// 各テストが固有の state を投入し、テスト間で状態を共有しない。
const seedPendingLogin = (): string => {
  const state = `state-${Date.now()}-${stateCounter++}`
  pendingLogins.put({
    codeVerifier: "verifier-fixed",
    state,
    nonce: PENDING_NONCE,
    returnTo: "/",
    createdAt: Date.now(),
  })

  return state
}

const runCallback = async (
  query: Record<string, string>,
): Promise<Recorded> => {
  const { res, recorded } = makeRes()
  await callbackHandler()(makeReq(query), res)

  return recorded
}

describe("mountAuthRoutes callback error mapping", () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  test("callback_missingCode_returns400InvalidRequest", async () => {
    const recorded = await runCallback({ state: "abc" })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_request" })
    expect(setCookieHeader(recorded)).toBeUndefined()
    expect(recorded.redirect).toBeUndefined()
  })

  test("callback_missingState_returns400InvalidRequest", async () => {
    const recorded = await runCallback({ code: "abc" })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_request" })
    expect(setCookieHeader(recorded)).toBeUndefined()
    expect(recorded.redirect).toBeUndefined()
  })

  test("callback_missingCodeAndState_returns400InvalidRequest", async () => {
    const recorded = await runCallback({})

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_request" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_unknownState_returns400InvalidState", async () => {
    const recorded = await runCallback({ code: "abc", state: "never-seeded" })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_state" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_tokenEndpointNotOk_returns502CodeExchangeFailed", async () => {
    server.use(http.post(TOKEN_ENDPOINT, () => new HttpResponse(null, { status: 503 })))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(502)
    expect(recorded.body).toEqual({ error: "code_exchange_failed" })
    expect(setCookieHeader(recorded)).toBeUndefined()
    expect(recorded.redirect).toBeUndefined()
  })

  test("callback_tokenEndpointNetworkError_returns502CodeExchangeFailed", async () => {
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.error()))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(502)
    expect(recorded.body).toEqual({ error: "code_exchange_failed" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_tokenResponseMissingIdToken_returns502CodeExchangeFailed", async () => {
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.json({})))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(502)
    expect(recorded.body).toEqual({ error: "code_exchange_failed" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_idTokenNotAJwt_returns400InvalidIdToken", async () => {
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.json({ id_token: "not-a-jwt" })))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_id_token" })
    expect(setCookieHeader(recorded)).toBeUndefined()
    expect(recorded.redirect).toBeUndefined()
  })

  test("callback_idTokenIssuerMismatch_returns400InvalidIdToken", async () => {
    const idToken = jwt({
      iss: "https://attacker.example/realms/master",
      aud: CLIENT_ID,
      exp: 4_000_000_000,
      iat: 1_000,
      sub: "user-1",
    })
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.json({ id_token: idToken })))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_id_token" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_idTokenAudienceMismatch_returns400InvalidIdToken", async () => {
    const idToken = jwt({
      iss: REALM_URL,
      aud: "some-other-client",
      exp: 4_000_000_000,
      iat: 1_000,
      sub: "user-1",
    })
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.json({ id_token: idToken })))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_id_token" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_idTokenNonceMismatch_returns400InvalidIdToken", async () => {
    const idToken = jwt({
      iss: REALM_URL,
      aud: CLIENT_ID,
      exp: 4_000_000_000,
      iat: 1_000,
      sub: "user-1",
      nonce: "nonce-from-a-different-login",
    })
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.json({ id_token: idToken })))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_id_token" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_idTokenExpired_returns400InvalidIdToken", async () => {
    const idToken = jwt({
      iss: REALM_URL,
      aud: CLIENT_ID,
      exp: 1_000,
      iat: 500,
      sub: "user-1",
      nonce: PENDING_NONCE,
    })
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.json({ id_token: idToken })))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBe(400)
    expect(recorded.body).toEqual({ error: "invalid_id_token" })
    expect(setCookieHeader(recorded)).toBeUndefined()
  })

  test("callback_validIdToken_setsCookieAndRedirects", async () => {
    const idToken = jwt({
      iss: REALM_URL,
      aud: CLIENT_ID,
      exp: 4_000_000_000,
      iat: 1_000,
      sub: "user-1",
      name: "User One",
      email: "user@example.com",
      nonce: PENDING_NONCE,
    })
    server.use(http.post(TOKEN_ENDPOINT, () => HttpResponse.json({ id_token: idToken })))
    const state = seedPendingLogin()

    const recorded = await runCallback({ code: "abc", state })

    expect(recorded.status).toBeUndefined()
    expect(recorded.redirect).toEqual({ status: 302, location: "/" })
    const cookie = setCookieHeader(recorded)
    expect(cookie).toBeDefined()
    expect(cookie).toContain("sid=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
  })
})
