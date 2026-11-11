/**
 * @vitest-environment node
 */
import { once } from "node:events"
import { request as httpRequest, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib"

import express, { type NextFunction, type Request, type Response } from "express"
import { http, passthrough } from "msw"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { llmJsonParser } from "../../../../server/llm/json-parser"
import { server as mswServer } from "../../mocks/server"

let httpServer: Server | undefined

const startApp = async (): Promise<string> => {
  const app = express()
  app.post("/api/llm/echo", llmJsonParser, (req, res) => {
    res.json({ body: req.body as unknown })
  })
  // Answers with the status of the body-parser error, as the default handler
  // does, without logging the stack trace.
  app.use((err: { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status ?? 500).end()
  })
  httpServer = app.listen(0, "127.0.0.1")
  await once(httpServer, "listening")
  const { port } = httpServer.address() as AddressInfo

  return `http://127.0.0.1:${port}`
}

const post = (url: string, body: Buffer, headers: Record<string, string>): Promise<{ status: number; text: string }> =>
  new Promise((resolve, reject) => {
    const req = httpRequest(
      url,
      { method: "POST", headers: { "Content-Type": "application/json", ...headers } },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }))
        res.on("error", reject)
      },
    )
    // The server may answer 415 before it reads the whole body.
    req.on("error", reject)
    req.end(body)
  })

const PAYLOAD = { input: "human liver RNA-seq", mode: "auto" }
const PAYLOAD_BYTES = Buffer.from(JSON.stringify(PAYLOAD))

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

describe("llmJsonParser", () => {
  test("llmJsonParser_plainJson_isParsed", async () => {
    const base = await startApp()
    const res = await post(`${base}/api/llm/echo`, PAYLOAD_BYTES, {})
    expect(res.status).toBe(200)
    expect(JSON.parse(res.text)).toEqual({ body: PAYLOAD })
  })

  test("llmJsonParser_identityEncoding_isParsed", async () => {
    const base = await startApp()
    const res = await post(`${base}/api/llm/echo`, PAYLOAD_BYTES, { "Content-Encoding": "identity" })
    expect(res.status).toBe(200)
    expect(JSON.parse(res.text)).toEqual({ body: PAYLOAD })
  })

  test("llmJsonParser_compressedBody_isRejectedWith415", async () => {
    const base = await startApp()
    const cases: [string, Buffer][] = [
      ["br", brotliCompressSync(PAYLOAD_BYTES)],
      ["gzip", gzipSync(PAYLOAD_BYTES)],
      ["deflate", deflateSync(PAYLOAD_BYTES)],
      ["BR", brotliCompressSync(PAYLOAD_BYTES)],
    ]
    const statuses: Record<string, number> = {}
    for (const [encoding, body] of cases) {
      statuses[encoding] = (await post(`${base}/api/llm/echo`, body, { "Content-Encoding": encoding })).status
    }
    expect(statuses).toEqual({ br: 415, gzip: 415, deflate: 415, BR: 415 })
  })

  test("llmJsonParser_brotliBombWithinLimit_isRejectedWith415", async () => {
    const base = await startApp()
    // 16 MB of zeros compresses to a few dozen bytes, far below the 32 KB limit.
    const bomb = brotliCompressSync(Buffer.alloc(16 * 1024 * 1024))
    expect(bomb.length).toBeLessThan(32 * 1024)
    const res = await post(`${base}/api/llm/echo`, bomb, { "Content-Encoding": "br" })
    expect(res.status).toBe(415)
  })

  test("llmJsonParser_unknownEncoding_isRejectedWith415", async () => {
    const base = await startApp()
    const res = await post(`${base}/api/llm/echo`, PAYLOAD_BYTES, { "Content-Encoding": "zstd" })
    expect(res.status).toBe(415)
  })

  test("llmJsonParser_bodyOver32KiB_isRejectedWith413", async () => {
    const base = await startApp()
    const body = Buffer.from(JSON.stringify({ input: "a".repeat(33 * 1024), mode: "auto" }))
    const res = await post(`${base}/api/llm/echo`, body, {})
    expect(res.status).toBe(413)
  })
})
