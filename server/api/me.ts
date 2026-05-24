import type { Request, Response } from "express"

import { getSidFromHeader } from "../auth/cookie"
import { sessionStore } from "../auth/session-store"

export const handleMe = (req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "no-store")
  const sid = getSidFromHeader(req.headers.cookie)
  if (!sid) {
    res.status(401).json({ error: "unauthorized" })

    return
  }
  const entry = sessionStore.get(sid)
  if (!entry) {
    res.status(401).json({ error: "unauthorized" })

    return
  }
  res.status(200).json({ user: entry.userInfo })
}
