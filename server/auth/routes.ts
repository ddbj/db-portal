import type { Request, Response, Router } from "express"

const notImplemented = (_req: Request, res: Response): void => {
  res.status(501).json({ error: "not_implemented" })
}

export const mountAuthRoutes = (router: Router): void => {
  router.get("/api/auth/login", notImplemented)
  router.get("/api/auth/logout", notImplemented)
}
