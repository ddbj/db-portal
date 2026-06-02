import { expect, test } from "./helpers"

test.describe("Auth Domain (anonymous)", () => {
  test("S-AUTH-01: 未認証で Header に「ログイン」 link", async ({ page }) => {
    const meResponse = await page.request.get("/api/me")
    expect(meResponse.status()).toBe(401)
    expect(await meResponse.json()).toEqual({ error: "unauthorized" })
    expect(meResponse.headers()["cache-control"]).toBe("no-store")

    await page.goto("/")

    const loginLink = page.getByRole("link", { name: "ログイン" })
    await expect(loginLink).toBeVisible({ timeout: 10_000 })
    await expect(loginLink).toHaveAttribute("href", "/api/auth/login?return_to=%2F")

    await expect(page.getByRole("link", { name: "ログアウト" })).toHaveCount(0)
  })

  test("S-AUTH-04: `/api/auth/login` が Keycloak authorize URL に 302", async ({ page }) => {
    const res = await page.request.get(
      "/api/auth/login?return_to=/databases/bioproject",
      { maxRedirects: 0 },
    )
    expect(res.status()).toBe(302)

    const location = res.headers()["location"]
    expect(location, "expected a Location header").toBeTruthy()
    if (!location) throw new Error("missing Location header")
    const authorizeUrl = new URL(location)
    expect(authorizeUrl.origin).toBe("https://idp-staging.ddbj.nig.ac.jp")
    expect(authorizeUrl.pathname).toBe("/realms/master/protocol/openid-connect/auth")

    const params = authorizeUrl.searchParams
    expect(params.get("response_type")).toBe("code")
    expect(params.get("code_challenge_method")).toBe("S256")
    expect(params.get("code_challenge") ?? "").not.toBe("")
    expect(params.get("scope")).toBe("openid profile email")
    expect(params.get("client_id")).toBe("db-portal-staging")
    expect(params.get("redirect_uri") ?? "").toMatch(/\/api\/auth\/callback$/)
    expect(params.get("state") ?? "").not.toBe("")

    const setCookie = res.headers()["set-cookie"]
    expect(setCookie ?? "").not.toMatch(/sid=/)
  })

  test("E-AUTH-01: callback で state 不一致 (CSRF / replay 防御)", async ({ page }) => {
    const res = await page.request.get(
      "/api/auth/callback?code=x&state=evil",
      { maxRedirects: 0 },
    )
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid_state" })

    const setCookie = res.headers()["set-cookie"]
    expect(setCookie ?? "").not.toMatch(/sid=/)
  })

  test("E-AUTH-03: callback で code / state 欠落 → invalid_request", async ({ page }) => {
    const onlyState = await page.request.get(
      "/api/auth/callback?state=onlystate",
      { maxRedirects: 0 },
    )
    expect(onlyState.status()).toBe(400)
    expect(await onlyState.json()).toEqual({ error: "invalid_request" })
    expect(onlyState.headers()["set-cookie"] ?? "").not.toMatch(/sid=/)

    const onlyCode = await page.request.get(
      "/api/auth/callback?code=onlycode",
      { maxRedirects: 0 },
    )
    expect(onlyCode.status()).toBe(400)
    expect(await onlyCode.json()).toEqual({ error: "invalid_request" })
    expect(onlyCode.headers()["set-cookie"] ?? "").not.toMatch(/sid=/)
  })
})
