import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { loadAuth } from "~/lib/auth/ssr-loader"

import { server } from "../../mocks/server"

const validUser = { sub: "u-1", name: "Taro", email: "taro@example.test" }

describe("loadAuth", () => {
  test("loadAuth_200_returnsUser", async () => {
    server.use(
      http.get("http://localhost:3000/api/me", () => HttpResponse.json({ user: validUser })),
    )
    const user = await loadAuth(new Request("http://localhost/some-page"))
    expect(user?.name).toBe("Taro")
  })

  test("loadAuth_401_returnsNull", async () => {
    server.use(
      http.get("http://localhost:3000/api/me", () =>
        new HttpResponse(null, { status: 401 }),
      ),
    )
    expect(await loadAuth(new Request("http://localhost/"))).toBeNull()
  })

  test("loadAuth_cookieForwarded", async () => {
    let captured = ""
    server.use(
      http.get("http://localhost:3000/api/me", ({ request }) => {
        captured = request.headers.get("cookie") ?? ""

        return HttpResponse.json({ user: validUser })
      }),
    )
    await loadAuth(
      new Request("http://localhost/", { headers: { Cookie: "sid=abc123" } }),
    )
    expect(captured).toBe("sid=abc123")
  })

  test("loadAuth_5xx_throws", async () => {
    server.use(
      http.get("http://localhost:3000/api/me", () =>
        new HttpResponse(null, { status: 502 }),
      ),
    )
    await expect(loadAuth(new Request("http://localhost/"))).rejects.toThrow(/502/)
  })

  test("loadAuth_invalidShape_throwsZodError", async () => {
    server.use(
      http.get("http://localhost:3000/api/me", () => HttpResponse.json({ user: { sub: "u1" } })),
    )
    await expect(loadAuth(new Request("http://localhost/"))).rejects.toThrow()
  })

  test("loadAuth_noCookie_doesNotSendCookieHeader", async () => {
    let captured: string | null = "missing"
    server.use(
      http.get("http://localhost:3000/api/me", ({ request }) => {
        captured = request.headers.get("cookie")

        return new HttpResponse(null, { status: 401 })
      }),
    )
    await loadAuth(new Request("http://localhost/"))
    expect(captured).toBeNull()
  })
})
