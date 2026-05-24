import type { Request, Response } from "express"

import type { ServerEnv } from "../../lib/env"

export type LlmHealth =
  | { status: "unset" }
  | { status: "ok"; model: string }
  | { status: "unreachable"; reason: string }

export const buildHealth = (env: ServerEnv): LlmHealth =>
  env.DB_PORTAL_LLM_BASE_URL
    ? { status: "ok", model: env.DB_PORTAL_LLM_MODEL }
    : { status: "unset" }

export const makeHandleLlmHealth = (env: ServerEnv) =>
  (_req: Request, res: Response): void => {
    res.setHeader("Cache-Control", "no-store")
    res.status(200).json(buildHealth(env))
  }
