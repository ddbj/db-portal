import type { Request, Response } from "express"

export const handleLlmProxy = (_req: Request, res: Response): void => {
  res.status(501).json({ error: "not_implemented" })
}
