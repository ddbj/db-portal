import type { RequestHandler } from "express"

import type { ServerEnv } from "../lib/env"
import { LLMS_PATH, PUBLIC_ENDPOINTS } from "./llms"

// production で crawler に拒否する path。検索結果ページは条件の組み合わせが
// 際限なく増えるので、リンクを辿る crawler が止まらない。auth の endpoint は
// Keycloak へのログインを始め、pending login をメモリに残す。
const CLOSED_WHEN_INDEXED = ["/search/results", "/api/auth/"] as const

// production 以外で crawler に許す path。llms.txt と、llms.txt が案内する
// endpoint はプログラムが読むためのものなので、robots.txt に従う agent にも
// 読ませる。
const OPEN_WHEN_NOINDEX = [LLMS_PATH, ...PUBLIC_ENDPOINTS.map((endpoint) => endpoint.path)]

export const renderRobotsTxt = (opts: {
  isProduction: boolean
  origin: string
}): string => {
  if (opts.isProduction) {
    return [
      "User-agent: *",
      ...CLOSED_WHEN_INDEXED.map((path) => `Disallow: ${path}`),
      "",
      `Sitemap: ${opts.origin.replace(/\/$/, "")}/sitemap.xml`,
      "",
    ].join("\n")
  }

  return [
    "User-agent: *",
    ...OPEN_WHEN_NOINDEX.map((path) => `Allow: ${path}`),
    "Disallow: /",
    "",
  ].join("\n")
}

export const handleRobots = (env: ServerEnv): RequestHandler =>
  (_req, res) => {
    res
      .type("text/plain")
      .set("Cache-Control", "public, max-age=3600")
      .send(renderRobotsTxt({
        isProduction: env.DB_PORTAL_ENV === "production",
        origin: env.DB_PORTAL_PORTAL_ORIGIN,
      }))
  }
