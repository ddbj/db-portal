import type { RequestHandler } from "express"

import type { ServerEnv } from "../lib/env"

export const renderRobotsTxt = (opts: {
  isProduction: boolean
  origin: string
}): string => {
  if (opts.isProduction) {
    return [
      "User-agent: *",
      "Allow: /",
      `Sitemap: ${opts.origin.replace(/\/$/, "")}/sitemap.xml`,
      "",
    ].join("\n")
  }

  return ["User-agent: *", "Disallow: /", ""].join("\n")
}

export const handleRobots = (env: ServerEnv): RequestHandler =>
  (_req, res) => {
    res.type("text/plain").send(renderRobotsTxt({
      isProduction: env.DB_PORTAL_ENV === "production",
      origin: env.DB_PORTAL_PORTAL_ORIGIN,
    }))
  }
