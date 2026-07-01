import type { Request, Response } from "express"
import { describe, expect, test, vi } from "vitest"

import { securityHeaders } from "../../../../server/lib/security"

type RecordedRes = {
  locals: Record<string, unknown>
  headers: Record<string, string>
  setHeader: ReturnType<typeof vi.fn>
}

const makeRes = (): RecordedRes => {
  const headers: Record<string, string> = {}

  return {
    locals: {},
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value
    }),
  }
}

const runMiddleware = (env: "dev" | "staging" | "production"): RecordedRes => {
  const middleware = securityHeaders({ env })
  const res = makeRes()
  const next = vi.fn()
  middleware({} as Request, res as unknown as Response, next)
  expect(next).toHaveBeenCalledOnce()

  return res
}

describe("securityHeaders", () => {
  test("securityHeaders_dev_emitsCspWithNonceButOmitsHsts", () => {
    // dev でも staging/production と同じ CSP を emit する。 nonce 抜けなど CSP を
    // 壊す変更を deploy 前に開発時点で気付けるようにするため。
    const res = runMiddleware("dev")

    expect(res.headers["X-Frame-Options"]).toBe("DENY")
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff")
    expect(res.headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    const csp = res.headers["Content-Security-Policy"]
    expect(csp).toContain(`'nonce-${res.locals.cspNonce as string}'`)
    expect(csp).toContain("default-src 'self'")
    expect(res.headers["Strict-Transport-Security"]).toBeUndefined()
    expect(typeof res.locals.cspNonce).toBe("string")
    expect((res.locals.cspNonce as string).length).toBeGreaterThan(0)
  })

  test("securityHeaders_staging_setsCspWithNonceWithoutHsts", () => {
    const res = runMiddleware("staging")
    const csp = res.headers["Content-Security-Policy"]
    expect(csp).toContain(`'nonce-${res.locals.cspNonce as string}'`)
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(res.headers["Strict-Transport-Security"]).toBeUndefined()
  })

  test("securityHeaders_production_setsCspWithNonceAndHsts", () => {
    const res = runMiddleware("production")
    const csp = res.headers["Content-Security-Policy"]
    expect(csp).toContain(`'nonce-${res.locals.cspNonce as string}'`)
    expect(res.headers["Strict-Transport-Security"]).toBe(
      "max-age=31536000; includeSubDomains",
    )
  })

  test("securityHeaders_perRequest_emitsUniqueNonce", () => {
    const a = runMiddleware("production")
    const b = runMiddleware("production")
    expect(a.locals.cspNonce).not.toBe(b.locals.cspNonce)
  })

  test("securityHeaders_csp_scriptSrcOmitsUnsafeInlineAndUnsafeEval", () => {
    const res = runMiddleware("production")
    const csp = res.headers["Content-Security-Policy"] ?? ""
    const scriptSrc = csp.split(";").find((p) => p.trim().startsWith("script-src"))
    expect(scriptSrc).toBeDefined()
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  test.each([
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["default-src", "'self'"],
  ])("securityHeaders_csp_directive_%s_isRestrictedTo_%s", (directive, expectedToken) => {
    const res = runMiddleware("production")
    const csp = res.headers["Content-Security-Policy"] ?? ""
    const part = csp.split(";").find((p) => p.trim().startsWith(directive))
    expect(part).toBeDefined()
    expect(part).toContain(expectedToken)
  })
})
