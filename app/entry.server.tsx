import { PassThrough } from "node:stream"

import { createReadableStreamFromReadable } from "@react-router/node"
import { isbot } from "isbot"
import { renderToPipeableStream } from "react-dom/server"
import type { EntryContext } from "react-router"
import { ServerRouter } from "react-router"

import { CSP_NONCE_HEADER } from "~/schemas/csp-nonce"

const ABORT_DELAY = 5_000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return isbot(request.headers.get("user-agent") ?? "")
    ? handleBotRequest(request, responseStatusCode, responseHeaders, routerContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, routerContext)
}

const handleBotRequest = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) => {
  return new Promise((resolve, reject) => {
    let shellRendered = false
    const nonce = request.headers.get(CSP_NONCE_HEADER) ?? ""
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />,
      {
        nonce,
        onAllReady() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)
          responseHeaders.set("Content-Type", "text/html")
          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }))
          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          // eslint-disable-next-line no-console -- last-resort SSR render error logging at the framework boundary; app/ cannot import the server logger (import zone)
          if (shellRendered) console.error(error)
        },
      },
    )
    setTimeout(abort, ABORT_DELAY)
  })
}

const handleBrowserRequest = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) => {
  return new Promise((resolve, reject) => {
    let shellRendered = false
    const nonce = request.headers.get(CSP_NONCE_HEADER) ?? ""
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />,
      {
        nonce,
        onShellReady() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)
          responseHeaders.set("Content-Type", "text/html")
          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }))
          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          // eslint-disable-next-line no-console -- last-resort SSR render error logging at the framework boundary; app/ cannot import the server logger (import zone)
          if (shellRendered) console.error(error)
        },
      },
    )
    setTimeout(abort, ABORT_DELAY)
  })
}
