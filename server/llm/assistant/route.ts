import type { Request, Response } from "express"
import { z } from "zod"

import { getSidFromHeader } from "../../auth/cookie"
import type { ServerEnv } from "../../lib/env"
import type { Logger } from "../../lib/log"
import { callVllmStreamRaw, createLlmClient, type LlmClient } from "../client"
import { getActiveRateLimiter } from "../rate-limit"
import { redactUserInput } from "../redaction"
import { openSseStream, readVllmStream } from "../sse"
import { parseAssistantOutput } from "./parse"
import { buildAssistantMessages } from "./prompt"

const RequestBody = z.object({
  input: z.string().trim().min(1),
})

const clientIp = (req: Request): string =>
  req.ip ?? req.socket.remoteAddress ?? "0.0.0.0"

export const makeHandleSearchAssistant = (
  env: ServerEnv,
  logger: Logger,
  overrides?: { client?: LlmClient },
) => {
  const client = overrides?.client ?? createLlmClient(env)

  return async (req: Request, res: Response): Promise<void> => {
    if (!client.isAvailable) {
      res.status(503).json({ error: "llm_unset" })

      return
    }
    const parsedBody = RequestBody.safeParse(req.body)
    if (!parsedBody.success) {
      res.status(400).json({ error: "invalid_request" })

      return
    }
    const sid = getSidFromHeader(req.headers.cookie)
    const limiter = getActiveRateLimiter()
    if (limiter) {
      const decision = limiter.check(clientIp(req), sid)
      if (!decision.ok) {
        res.setHeader("Retry-After", decision.retryAfterSec.toString())
        res.status(429).json({ error: "rate_limited", axis: decision.axis })

        return
      }
    }
    const safeInput = redactUserInput(parsedBody.data.input)
    logger.debug("llm_assistant_request", { inputLength: safeInput.length })

    const stream = openSseStream(res)
    stream.start()
    const abortController = new AbortController()
    req.on("close", () => abortController.abort())

    let accumulated = ""
    try {
      const messages = buildAssistantMessages({ userInput: parsedBody.data.input })
      const upstreamResp = await callVllmStreamRaw(
        client,
        { messages, temperature: 0, stream: true },
        abortController.signal,
      )
      if (!upstreamResp.ok) {
        stream.error("upstream-status", `vLLM responded ${upstreamResp.status}`)
        stream.close()

        return
      }
      const result = await readVllmStream(
        upstreamResp.body,
        abortController.signal,
        (delta) => {
          accumulated += delta
          stream.message(delta)
        },
      )
      if (!result.ok) {
        stream.error("upstream-disconnect", result.reason ?? "stream interrupted")
        stream.close()

        return
      }
      const parsedOutcome = parseAssistantOutput(accumulated)
      if (!parsedOutcome.ok) {
        stream.error(parsedOutcome.code, parsedOutcome.message)
        stream.close()

        return
      }
      stream.done(JSON.stringify(parsedOutcome.proposal))
    } catch (error) {
      const aborted = (error as { name?: string }).name === "AbortError"
      if (!aborted) {
        logger.error("llm_assistant_failed", {
          message: error instanceof Error ? error.message : String(error),
        })
        stream.error("upstream-disconnect", error instanceof Error ? error.message : "unknown")
      }
    } finally {
      stream.close()
    }
  }
}
