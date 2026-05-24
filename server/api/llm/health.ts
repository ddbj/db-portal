import type { Request, Response } from "express"

import { getCurrentHealth } from "../../llm/health"

export const handleLlmHealth = (_req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "no-store")
  res.status(200).json(getCurrentHealth())
}
