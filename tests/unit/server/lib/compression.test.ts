/**
 * @vitest-environment node
 */
import { once } from "node:events"
import { type IncomingHttpHeaders, request as httpRequest, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { brotliDecompressSync, gunzipSync } from "node:zlib"

import express, { type Express } from "express"
import { http, passthrough } from "msw"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { compressResponses } from "../../../../server/lib/compression"
import { openSseStream } from "../../../../server/llm/sse"
import { server as mswServer } from "../../mocks/server"

// Large enough to pass the 1 KB threshold of the middleware.
const LARGE_JSON = JSON.stringify(
  Array.from({ length: 200 }, (_, i) => ({ id: `n-${i}`, title: "お知らせ announcement" })),
)

let httpServer: Server | undefined

const startApp = async (setup: (app: Express) => void): Promise<string> => {
  const app = express()
  app.use(compressResponses())
  setup(app)
  httpServer = app.listen(0, "127.0.0.1")
  await once(httpServer, "listening")
  const { port } = httpServer.address() as AddressInfo

  return `http://127.0.0.1:${port}`
}

type RawResponse = { status: number; headers: IncomingHttpHeaders; body: Buffer }

// node:http does not decompress, so the test sees the bytes on the wire.
const get = (url: string, acceptEncoding?: string): Promise<RawResponse> =>
  new Promise((resolve, reject) => {
    const headers = acceptEncoding === undefined ? {} : { "Accept-Encoding": acceptEncoding }
    const req = httpRequest(url, { headers }, (res) => {
      const chunks: Buffer[] = []
      res.on("data", (chunk: Buffer) => chunks.push(chunk))
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }))
      res.on("error", reject)
    })
    req.on("error", reject)
    req.end()
  })

const largeJsonApp = (paths: readonly string[]) => (app: Express) => {
  for (const path of paths) {
    app.get(path, (_req, res) => {
      res.type("application/json").send(LARGE_JSON)
    })
  }
}

beforeEach(() => {
  mswServer.use(http.all(/^http:\/\/127\.0\.0\.1:\d+\//, () => passthrough()))
})

afterEach(async () => {
  if (httpServer) {
    httpServer.closeAllConnections()
    await new Promise<void>((resolve) => httpServer?.close(() => resolve()))
    httpServer = undefined
  }
})

describe("compressResponses", () => {
  test("compressResponses_brotliAccepted_sendsBrotliThatDecodesToOriginal", async () => {
    const base = await startApp(largeJsonApp(["/api/news"]))
    const res = await get(`${base}/api/news`, "gzip, deflate, br")
    expect(res.headers["content-encoding"]).toBe("br")
    expect(res.headers.vary).toMatch(/Accept-Encoding/i)
    expect(brotliDecompressSync(res.body).toString("utf8")).toBe(LARGE_JSON)
    expect(res.body.length).toBeLessThan(Buffer.byteLength(LARGE_JSON))
  })

  test("compressResponses_gzipOnly_sendsGzipThatDecodesToOriginal", async () => {
    const base = await startApp(largeJsonApp(["/api/news"]))
    const res = await get(`${base}/api/news`, "gzip")
    expect(res.headers["content-encoding"]).toBe("gzip")
    expect(gunzipSync(res.body).toString("utf8")).toBe(LARGE_JSON)
  })

  test("compressResponses_noAcceptEncoding_sendsIdentity", async () => {
    const base = await startApp(largeJsonApp(["/api/news"]))
    const res = await get(`${base}/api/news`)
    expect(res.headers["content-encoding"]).toBeUndefined()
    expect(res.body.toString("utf8")).toBe(LARGE_JSON)
  })

  test("compressResponses_bodyBelowThreshold_isNotCompressed", async () => {
    const base = await startApp((app) => {
      app.get("/api/small", (_req, res) => {
        res.json({ ok: true })
      })
    })
    const res = await get(`${base}/api/small`, "br, gzip")
    expect(res.headers["content-encoding"]).toBeUndefined()
    expect(JSON.parse(res.body.toString("utf8"))).toEqual({ ok: true })
  })

  test("compressResponses_sessionPaths_areNotCompressed", async () => {
    const paths = ["/api/me", "/api/auth/callback", "/api/auth/logout-callback"]
    const base = await startApp(largeJsonApp(paths))
    const results: Record<string, unknown> = {}
    for (const path of [...paths, "/API/ME", "/api/me/", "/Api/Auth/Callback"]) {
      const res = await get(`${base}${path}`, "br, gzip")
      results[path] = {
        status: res.status,
        encoding: res.headers["content-encoding"],
        intact: res.body.toString("utf8") === LARGE_JSON,
      }
    }
    const expected = { status: 200, encoding: undefined, intact: true }
    expect(results).toEqual({
      "/api/me": expected,
      "/api/auth/callback": expected,
      "/api/auth/logout-callback": expected,
      "/API/ME": expected,
      "/api/me/": expected,
      "/Api/Auth/Callback": expected,
    })
  })

  test("compressResponses_pathsThatOnlyStartLikeSessionPaths_areCompressed", async () => {
    const paths = ["/api/meta", "/api/authors", "/api/news/me", "/me"]
    const base = await startApp(largeJsonApp(paths))
    const encodings: Record<string, unknown> = {}
    for (const path of paths) {
      encodings[path] = (await get(`${base}${path}`, "br")).headers["content-encoding"]
    }
    expect(encodings).toEqual(Object.fromEntries(paths.map((path) => [path, "br"])))
  })

  test("compressResponses_sse_isNotCompressedAndEventsArriveBeforeEnd", async () => {
    let release: () => void = () => undefined
    const released = new Promise<void>((resolve) => {
      release = resolve
    })
    const base = await startApp((app) => {
      app.get("/api/llm/stream", async (_req, res) => {
        const stream = openSseStream(res)
        stream.start()
        await released
        stream.done("x".repeat(4096))
        stream.close()
      })
    })

    const firstChunk = await new Promise<{ headers: IncomingHttpHeaders; text: string }>(
      (resolve, reject) => {
        const req = httpRequest(
          `${base}/api/llm/stream`,
          { headers: { "Accept-Encoding": "br, gzip" } },
          (res) => {
            res.once("data", (chunk: Buffer) => {
              resolve({ headers: res.headers, text: chunk.toString("utf8") })
              res.resume()
              release()
            })
            res.on("error", reject)
          },
        )
        req.on("error", reject)
        req.end()
      },
    )

    expect(firstChunk.headers["content-type"]).toMatch(/^text\/event-stream/)
    expect(firstChunk.headers["content-encoding"]).toBeUndefined()
    expect(firstChunk.text).toContain(": stream-open")
  })
})
