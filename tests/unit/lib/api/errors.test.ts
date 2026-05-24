import { describe, expect, test } from "vitest"

import { APIError, isAPIError, toAPIError } from "~/lib/api/errors"

const problemHeaders = (contentType: string): Headers => {
  const h = new Headers()
  h.set("content-type", contentType)

  return h
}

describe("APIError", () => {
  test("APIError_minimalInit_buildsMessageFromStatus", () => {
    const err = new APIError({ status: 503 })
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe("APIError")
    expect(err.status).toBe(503)
    expect(err.type).toBe("about:blank")
    expect(err.title).toBe("")
    expect(err.message).toBe("HTTP 503")
  })

  test("APIError_titleProvided_includesTitleInMessage", () => {
    const err = new APIError({ status: 400, title: "Bad Request", type: "https://example.test/x" })
    expect(err.message).toBe("400 Bad Request")
    expect(err.type).toBe("https://example.test/x")
  })
})

describe("isAPIError", () => {
  test("isAPIError_apiErrorInstance_returnsTrue", () => {
    expect(isAPIError(new APIError({ status: 500 }))).toBe(true)
  })

  test("isAPIError_plainError_returnsFalse", () => {
    expect(isAPIError(new Error("nope"))).toBe(false)
  })

  test("isAPIError_nonError_returnsFalse", () => {
    expect(isAPIError({ status: 500 })).toBe(false)
    expect(isAPIError(null)).toBe(false)
    expect(isAPIError(undefined)).toBe(false)
  })
})

describe("toAPIError", () => {
  test("toAPIError_problemJson_extractsFields", async () => {
    const body = {
      type: "https://example.test/errors/missing-db",
      title: "Missing DB",
      status: 400,
      detail: "db parameter required",
      instance: "/db-portal/search",
    }
    const response = new Response(JSON.stringify(body), {
      status: 400,
      headers: problemHeaders("application/problem+json"),
    })
    const err = await toAPIError(response)
    expect(err.status).toBe(400)
    expect(err.type).toBe(body.type)
    expect(err.title).toBe("Missing DB")
    expect(err.detail).toBe("db parameter required")
    expect(err.instance).toBe("/db-portal/search")
  })

  test("toAPIError_nonJson_fallsBackToStatusText", async () => {
    const response = new Response("oops", {
      status: 500,
      statusText: "Internal Server Error",
      headers: problemHeaders("text/plain"),
    })
    const err = await toAPIError(response)
    expect(err.status).toBe(500)
    expect(err.title).toBe("Internal Server Error")
    expect(err.type).toBe("about:blank")
  })

  test("toAPIError_malformedJson_doesNotThrow", async () => {
    const response = new Response("not-json{", {
      status: 502,
      headers: problemHeaders("application/json"),
    })
    const err = await toAPIError(response)
    expect(err.status).toBe(502)
    expect(err.type).toBe("about:blank")
  })

  test("toAPIError_problemStatusDiffersFromHttpStatus_prefersProblemStatus", async () => {
    const body = { status: 409, title: "Conflict" }
    const response = new Response(JSON.stringify(body), {
      status: 400,
      headers: problemHeaders("application/problem+json"),
    })
    const err = await toAPIError(response)
    expect(err.status).toBe(409)
    expect(err.title).toBe("Conflict")
  })

  test("toAPIError_problemBodyWithEmptyTitle_fallsBackToStatusText", async () => {
    const body = { type: "https://x", title: "" }
    const response = new Response(JSON.stringify(body), {
      status: 503,
      statusText: "Service Unavailable",
      headers: problemHeaders("application/problem+json"),
    })
    const err = await toAPIError(response)
    expect(err.title).toBe("Service Unavailable")
    expect(err.type).toBe("https://x")
  })

  test("toAPIError_noContentTypeHeader_doesNotParseBody", async () => {
    const headers = new Headers()
    const response = new Response(JSON.stringify({ title: "ignored" }), {
      status: 500,
      statusText: "Boom",
      headers,
    })
    const err = await toAPIError(response)
    expect(err.title).toBe("Boom")
    expect(err.type).toBe("about:blank")
  })

  test("toAPIError_problemBodyWithNonStringTitle_zodRejectsAndFallsBack", async () => {
    const body = { title: 42, status: 503 }
    const response = new Response(JSON.stringify(body), {
      status: 503,
      statusText: "Boom",
      headers: problemHeaders("application/problem+json"),
    })
    const err = await toAPIError(response)
    expect(err.title).toBe("Boom")
  })
})
