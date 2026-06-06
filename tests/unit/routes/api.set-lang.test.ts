import type { ActionFunctionArgs } from "react-router"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { action } from "~/routes/api.set-lang"

const callAction = (request: Request): Promise<Response> =>
  action({ request, params: {}, context: {} } as unknown as ActionFunctionArgs) as Promise<Response>

const buildRequest = (body: string, init: { referer?: string } = {}): Request =>
  new Request("http://localhost/api/set-lang", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.referer === undefined ? {} : { Referer: init.referer }),
    },
    body,
  })

const originalEnv = process.env.DB_PORTAL_ENV

beforeEach(() => {
  process.env.DB_PORTAL_ENV = "dev"
})

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.DB_PORTAL_ENV
  } else {
    process.env.DB_PORTAL_ENV = originalEnv
  }
})

describe("api.set-lang action", () => {
  test("setLang_validEn_returns303AndSetsCookieAndRedirectsToRefererPath", async () => {
    const res = await callAction(buildRequest("lang=en", { referer: "http://localhost/news" }))
    expect(res.status).toBe(303)
    expect(res.headers.get("Location")).toBe("/news")
    const setCookie = res.headers.get("Set-Cookie")
    expect(setCookie).not.toBeNull()
    expect(setCookie).toContain("db_portal_lang=en")
  })

  test("setLang_sameOriginRefererWithQuery_preservesPathAndSearch", async () => {
    const res = await callAction(
      buildRequest("lang=en", { referer: "http://localhost/search/results?q=foo&db=biosample" }),
    )
    expect(res.headers.get("Location")).toBe("/search/results?q=foo&db=biosample")
  })

  test("setLang_crossOriginReferer_fallsBackToRoot", async () => {
    const res = await callAction(buildRequest("lang=en", { referer: "https://evil.example/phish" }))
    expect(res.status).toBe(303)
    expect(res.headers.get("Location")).toBe("/")
  })

  test("setLang_unparseableReferer_fallsBackToRoot", async () => {
    const res = await callAction(buildRequest("lang=en", { referer: "://not-a-url" }))
    expect(res.headers.get("Location")).toBe("/")
  })

  test("setLang_validJa_returns303AndSetsJaCookie", async () => {
    const res = await callAction(buildRequest("lang=ja", { referer: "http://localhost/news" }))
    expect(res.status).toBe(303)
    expect(res.headers.get("Set-Cookie")).toContain("db_portal_lang=ja")
  })

  test("setLang_noReferer_redirectsToRoot", async () => {
    const res = await callAction(buildRequest("lang=en"))
    expect(res.status).toBe(303)
    expect(res.headers.get("Location")).toBe("/")
  })

  test("setLang_invalidLang_returns400", async () => {
    const res = await callAction(buildRequest("lang=fr", { referer: "http://localhost/" }))
    expect(res.status).toBe(400)
  })

  test("setLang_emptyBody_returns400", async () => {
    const res = await callAction(buildRequest("", { referer: "http://localhost/" }))
    expect(res.status).toBe(400)
  })

  test("setLang_devEnv_omitsSecureFlag", async () => {
    process.env.DB_PORTAL_ENV = "dev"
    const res = await callAction(buildRequest("lang=en", { referer: "http://localhost/" }))
    const setCookie = res.headers.get("Set-Cookie") ?? ""
    expect(setCookie.toLowerCase()).not.toContain("secure")
  })

  test("setLang_productionEnv_appendsSecureFlag", async () => {
    process.env.DB_PORTAL_ENV = "production"
    const res = await callAction(buildRequest("lang=en", { referer: "http://localhost/" }))
    const setCookie = res.headers.get("Set-Cookie") ?? ""
    expect(setCookie.toLowerCase()).toContain("secure")
  })

  test("setLang_stagingEnv_appendsSecureFlag", async () => {
    process.env.DB_PORTAL_ENV = "staging"
    const res = await callAction(buildRequest("lang=en", { referer: "http://localhost/" }))
    const setCookie = res.headers.get("Set-Cookie") ?? ""
    expect(setCookie.toLowerCase()).toContain("secure")
  })
})
