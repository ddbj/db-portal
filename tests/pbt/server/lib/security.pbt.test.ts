import { test } from "@fast-check/vitest"
import type { Request, Response } from "express"
import fc from "fast-check"
import { describe, expect, vi } from "vitest"

import { securityHeaders } from "../../../../server/lib/security"

type Env = "dev" | "staging" | "production"
const arbEnv: fc.Arbitrary<Env> = fc.constantFrom("dev", "staging", "production")

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

const runOnce = (env: Env): RecordedRes => {
  const res = makeRes()
  const next = vi.fn()
  securityHeaders({ env })({} as Request, res as unknown as Response, next)

  return res
}

describe("securityHeaders PBT", () => {
  test.prop([arbEnv])(
    "securityHeaders_anyEnv_nonceIsNonEmptyString",
    (env) => {
      const res = runOnce(env)
      const nonce = res.locals.cspNonce
      expect(typeof nonce).toBe("string")
      expect((nonce as string).length).toBeGreaterThan(0)
    },
  )

  test.prop([arbEnv, fc.integer({ min: 2, max: 20 })])(
    "securityHeaders_repeatedInvocations_nonceIsUniqueAcrossCalls",
    (env, n) => {
      const nonces = new Set<string>()
      for (let i = 0; i < n; i++) {
        const res = runOnce(env)
        nonces.add(res.locals.cspNonce as string)
      }
      expect(nonces.size).toBe(n)
    },
  )

  test.prop([arbEnv])(
    "securityHeaders_anyEnv_basicHeadersArePresent",
    (env) => {
      const res = runOnce(env)
      expect(res.headers["X-Frame-Options"]).toBe("DENY")
      expect(res.headers["X-Content-Type-Options"]).toBe("nosniff")
      expect(res.headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    },
  )
})
