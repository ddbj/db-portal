import fs from "node:fs/promises"
import path from "node:path"

import type { RequestHandler } from "express"

import type { ServerEnv } from "../lib/env"

const STATIC_PATHS = ["/", "/search", "/submit", "/news"] as const

const CONTENT_DATABASES_DIR = "app/content/databases"

const listDatabaseSlugs = async (): Promise<readonly string[]> => {
  const dir = path.resolve(process.cwd(), CONTENT_DATABASES_DIR)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const joinUrl = (origin: string, pathname: string): string => {
  const base = origin.replace(/\/$/, "")
  const suffix = pathname.startsWith("/") ? pathname : `/${pathname}`

  return `${base}${suffix}`
}

const normalizeUrlPath = (p: string): string => {
  const collapsed = p.replace(/\/{2,}/g, "/")
  if (collapsed === "/") return "/"

  return collapsed.replace(/\/+$/, "")
}

export const buildSitemapEntries = (
  origin: string,
  databaseSlugs: readonly string[],
): readonly string[] => {
  const localePrefixes = ["", "/en"] as const
  const paths = [
    ...STATIC_PATHS,
    ...databaseSlugs.map((slug) => `/databases/${slug}`),
  ]

  return localePrefixes.flatMap((prefix) =>
    paths.map((p) => joinUrl(origin, normalizeUrlPath(`${prefix}${p}`))),
  )
}

export const renderSitemapXml = (urls: readonly string[]): string => {
  const body = urls
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}

export const handleSitemap = (env: ServerEnv): RequestHandler =>
  async (_req, res) => {
    const slugs = await listDatabaseSlugs()
    const urls = buildSitemapEntries(env.DB_PORTAL_PORTAL_ORIGIN, slugs)
    res.type("application/xml").send(renderSitemapXml(urls))
  }
