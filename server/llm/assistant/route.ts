import type { Request, Response } from "express"
import { z } from "zod"

import { ASSISTANT_DB_SLUGS } from "../../../app/schemas/api-bff/llm"
import { getSidFromHeader } from "../../auth/cookie"
import type { ServerEnv } from "../../lib/env"
import type { Logger } from "../../lib/log"
import { callVllmStreamRaw, createLlmClient, type LlmClient } from "../client"
import { getActiveRateLimiter } from "../rate-limit"
import { redactUserInput } from "../redaction"
import { openSseStream, readVllmStream } from "../sse"
import { parseModelOutput } from "./parse"
import { buildAssistantMessages } from "./prompt"
import { serializeAstToDsl } from "./search-api"

const RequestBody = z.object({
  input: z.string().trim().min(1),
  mode: z.enum(["new", "append"]).optional(),
  current: z.unknown().optional(),
  // The locked single-DB scope (per-DB results page). Absent on top / cross-search,
  // where the BFF derives the DB from the generated DSL.
  db: z.enum(ASSISTANT_DB_SLUGS).optional(),
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
    const { input, mode, current, db } = parsedBody.data
    const safeInput = redactUserInput(input)
    logger.debug("llm_assistant_request", { inputLength: safeInput.length, mode: mode ?? "new", db: db ?? "auto" })

    const stream = openSseStream(res)
    stream.start()
    const abortController = new AbortController()
    res.on("close", () => abortController.abort())

    let accumulated = ""
    try {
      // append mode seeds the prompt with the current builder query (serialized
      // by ddbj-search-api); a serialize failure degrades to fresh generation.
      const currentDsl = mode === "append" && current !== undefined
        ? await serializeAstToDsl(current, { env })
        : undefined
      const messages = buildAssistantMessages({ userInput: input, currentDsl, db })
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
      // Accumulate the model output server-side only; never forward raw deltas to
      // the client (the output contract is a validated DSL/AST, so a prompt
      // injection cannot turn this endpoint into an open LLM proxy). docs/llm.md.
      const result = await readVllmStream(
        upstreamResp.body,
        abortController.signal,
        (delta) => { accumulated += delta },
      )
      if (!result.ok) {
        stream.error("upstream-disconnect", result.reason ?? "stream interrupted")
        stream.close()

        return
      }
      // db set = locked single-DB; absent = auto (the BFF derives the DB).
      const outcome = await parseModelOutput(accumulated, db ?? null, { env })
      if (!outcome.ok) {
        const code = outcome.code === "upstream" ? "upstream-disconnect" : outcome.code
        stream.error(code, outcome.message)
        stream.close()

        return
      }
      stream.done(JSON.stringify({ ast: outcome.ast, db: outcome.db }))
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
