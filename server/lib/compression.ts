import { constants } from "node:zlib"

import compression from "compression"
import type { Request, RequestHandler, Response } from "express"

// Express matches routes case-insensitively and ignores a trailing slash, so
// the check does the same.
const SESSION_PATH = /^\/api\/(?:me|auth)(?:\/|$)/i

/**
 * Responses on these paths depend on the session. If a compressed response
 * holds a secret and attacker-supplied input together, the attacker can guess
 * the secret from the compressed length (BREACH).
 */
export const isSessionPath = (path: string): boolean => SESSION_PATH.test(path)

const isEventStream = (res: Response): boolean => {
  const type = res.getHeader("Content-Type")

  return typeof type === "string" && type.toLowerCase().startsWith("text/event-stream")
}

export const shouldCompress = (req: Request, res: Response): boolean => {
  // The middleware holds output back to compress it, so SSE events would not
  // reach the client.
  if (isEventStream(res)) return false
  if (isSessionPath(req.path)) return false

  return compression.filter(req, res)
}

// Node's default brotli quality (11) spends seconds of CPU on a response of a
// few MB, so repeated requests could use up the CPU.
export const BROTLI_QUALITY = 4

export const compressResponses = (): RequestHandler =>
  compression({
    filter: shouldCompress,
    brotli: { params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } },
  })
