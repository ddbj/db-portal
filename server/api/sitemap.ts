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

const trimOrigin = (origin: string): string => origin.replace(/\/$/, "")

const normalizeUrlPath = (p: string): string => {
  const collapsed = p.replace(/\/{2,}/g, "/")
  if (collapsed === "/") return "/"

  return collapsed.replace(/\/+$/, "")
}

type SitemapAlternate = {
  hreflang: "ja" | "en" | "x-default"
  href: string
}

type SitemapEntry = {
  loc: string
  alternates: readonly SitemapAlternate[]
}

export const buildSitemapEntries = (
  origin: string,
  databaseSlugs: readonly string[],
): readonly SitemapEntry[] => {
  const base = trimOrigin(origin)
  const paths = [
    ...STATIC_PATHS,
    ...databaseSlugs.map((slug) => `/databases/${slug}`),
  ]

  return paths.flatMap((rawPath): SitemapEntry[] => {
    const normalized = normalizeUrlPath(rawPath)
    const jaUrl = `${base}${normalized}?lang=ja`
    const enUrl = `${base}${normalized}?lang=en`
    const alternates: readonly SitemapAlternate[] = [
      { hreflang: "ja", href: jaUrl },
      { hreflang: "en", href: enUrl },
      { hreflang: "x-default", href: jaUrl },
    ]
    return [
      { loc: jaUrl, alternates },
      { loc: enUrl, alternates },
    ]
  })
}

export const renderSitemapXml = (entries: readonly SitemapEntry[]): string => {
  const body = entries
    .map((entry) => {
      const alternates = entry.alternates
        .map(
          (a) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}"/>`,
        )
        .join("\n")

      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n${alternates}\n  </url>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`
}

export const handleSitemap = (env: ServerEnv): RequestHandler =>
  async (_req, res) => {
    const slugs = await listDatabaseSlugs()
    const entries = buildSitemapEntries(env.DB_PORTAL_PORTAL_ORIGIN, slugs)
    res.type("application/xml").send(renderSitemapXml(entries))
  }
