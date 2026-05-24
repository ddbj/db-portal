import type { Request, Response } from "express"

export const handleNews = (_req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "public, max-age=60")
  res.status(200).json([])
}
