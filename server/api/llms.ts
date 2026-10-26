import type { RequestHandler } from "express"

import type { ServerEnv } from "../lib/env"

export const LLMS_PATH = "/llms.txt"

// llms.txt が案内する BFF の endpoint。production 以外の robots.txt は、この
// 一覧と llms.txt だけを Allow する。
export const PUBLIC_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/news",
    summary:
      "News items from the DDBJ and DBCLS sites, as JSON. Filter with `lang`, `source`, `category`, `year`, and `service`.",
  },
  {
    method: "GET",
    path: "/api/services",
    summary:
      "The services that DDBJ and DBCLS run, as JSON. Filter with `source`, `category`, and `featured`.",
  },
] as const

const trimTrailingSlash = (url: string): string => url.replace(/\/$/, "")

// 配置ごとの origin と検索 API の URL で書く。llms.txt の読み手はこの配置の
// URL を辿るので、別の配置の URL を書かない。
export const renderLlmsText = (opts: {
  origin: string
  searchApiUrl: string
  openapiUrl: string
}): string => {
  const origin = trimTrailingSlash(opts.origin)
  const searchApi = trimTrailingSlash(opts.searchApiUrl)

  return [
    "# BSI",
    "",
    "> BioData Science Initiative (BSI) is the entry point for submitting data to the databases that DDBJ and DBCLS run, and for searching across those databases. The site is published in Japanese and English.",
    "",
    "To search the databases, use ddbj-search-api. The search pages of this site call that API directly, and the API answers the same queries as JSON. The API of this site returns only what the site publishes by itself: news items and the list of services.",
    "",
    "## Search",
    "",
    `- [ddbj-search-api documentation](${searchApi}/docs): every endpoint, the query language, and the shape of each answer`,
    `- [ddbj-search-api OpenAPI document](${opts.openapiUrl})`,
    "",
    "## Endpoints",
    "",
    ...PUBLIC_ENDPOINTS.map(
      (endpoint) => `- [${endpoint.method} ${endpoint.path}](${origin}${endpoint.path}): ${endpoint.summary}`,
    ),
    "",
  ].join("\n")
}

export const handleLlms = (env: ServerEnv): RequestHandler =>
  (_req, res) => {
    res
      .type("text/markdown")
      .set("Cache-Control", "public, max-age=3600")
      .send(renderLlmsText({
        origin: env.DB_PORTAL_PORTAL_ORIGIN,
        searchApiUrl: env.DB_PORTAL_SEARCH_API_URL,
        openapiUrl: env.DB_PORTAL_OPENAPI_URL,
      }))
  }
