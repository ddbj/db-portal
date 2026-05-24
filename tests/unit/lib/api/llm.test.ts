import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { fetchLlmHealth, isLlmAvailable } from "~/lib/api/llm"

import { server } from "../../mocks/server"

describe("fetchLlmHealth", () => {
  test("fetchLlmHealth_unset_returnsUnsetStatus", async () => {
    server.use(
      http.get("http://localhost/api/llm/health", () => HttpResponse.json({ status: "unset" })),
    )
    const health = await fetchLlmHealth({ baseUrl: "http://localhost" })
    expect(health.status).toBe("unset")
  })

  test("fetchLlmHealth_ok_returnsModel", async () => {
    server.use(
      http.get("http://localhost/api/llm/health", () =>
        HttpResponse.json({ status: "ok", model: "Qwen2.5-32B" }),
      ),
    )
    const health = await fetchLlmHealth({ baseUrl: "http://localhost" })
    expect(health).toEqual({ status: "ok", model: "Qwen2.5-32B" })
  })

  test("fetchLlmHealth_unreachable_returnsReason", async () => {
    server.use(
      http.get("http://localhost/api/llm/health", () =>
        HttpResponse.json({ status: "unreachable", reason: "ECONNREFUSED" }),
      ),
    )
    const health = await fetchLlmHealth({ baseUrl: "http://localhost" })
    expect(health).toEqual({ status: "unreachable", reason: "ECONNREFUSED" })
  })

  test("fetchLlmHealth_invalidStatus_throwsZodError", async () => {
    server.use(
      http.get("http://localhost/api/llm/health", () =>
        HttpResponse.json({ status: "weird" }),
      ),
    )
    await expect(fetchLlmHealth({ baseUrl: "http://localhost" })).rejects.toThrow()
  })
})

describe("isLlmAvailable", () => {
  test("isLlmAvailable_ok_returnsTrue", () => {
    expect(isLlmAvailable({ status: "ok", model: "x" })).toBe(true)
  })

  test("isLlmAvailable_unset_returnsFalse", () => {
    expect(isLlmAvailable({ status: "unset" })).toBe(false)
  })

  test("isLlmAvailable_unreachable_returnsFalse", () => {
    expect(isLlmAvailable({ status: "unreachable", reason: "x" })).toBe(false)
  })
})
