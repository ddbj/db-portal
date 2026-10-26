import type { Request, Response } from "express"
import { describe, expect, test, vi } from "vitest"

import { handleApiNotFound } from "../../../../server/api/not-found"

type Captured = { headers: Record<string, string>; statusCode: number | undefined; body: unknown }

const fakeResponse = (): { res: Response; captured: Captured } => {
  const captured: Captured = { headers: {}, statusCode: undefined, body: undefined }
  const res = {
    setHeader(name: string, value: string): Response {
      captured.headers[name] = value

      return res
    },
    status(code: number): Response {
      captured.statusCode = code

      return res
    },
    json(body: unknown): Response {
      captured.body = body

      return res
    },
  } as unknown as Response

  return { res, captured }
}

const requestOf = (path: string): Request => ({ path }) as unknown as Request

describe("handleApiNotFound", () => {
  test("handleApiNotFound_unknownApiPath_responds404Json", () => {
    const { res, captured } = fakeResponse()
    const next = vi.fn()
    handleApiNotFound(requestOf("/api/does-not-exist"), res, next)

    expect(captured.statusCode).toBe(404)
    expect(captured.body).toEqual({ error: "not_found" })
    expect(captured.headers["Cache-Control"]).toBe("no-store")
    expect(next).not.toHaveBeenCalled()
  })

  test("handleApiNotFound_setLang_passesToReactRouter", () => {
    const { res, captured } = fakeResponse()
    const next = vi.fn()
    handleApiNotFound(requestOf("/api/set-lang"), res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(captured.statusCode).toBeUndefined()
    expect(captured.body).toBeUndefined()
  })

  test("handleApiNotFound_setLangWithSuffix_isNotPassedThrough", () => {
    // `/api/set-lang` だけが React Router の route で、その下の path は無い。
    const { res, captured } = fakeResponse()
    const next = vi.fn()
    handleApiNotFound(requestOf("/api/set-lang/extra"), res, next)

    expect(next).not.toHaveBeenCalled()
    expect(captured.statusCode).toBe(404)
  })
})
