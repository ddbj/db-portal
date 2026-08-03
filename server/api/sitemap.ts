import fs from "node:fs/promises"
import path from "node:path"

import type { RequestHandler } from "express"

import type { ServerEnv } from "../lib/env"

const STATIC_PATHS = [
  "/",
  "/search",
  "/submit",
  "/news",
  "/services",
  "/docs",
  "/contact",
] as const

const PAGE_CONTENTS_DIR = "page-contents"

// app/lib/content/markdown-loader.ts:extractUrlPath と同じ規約: index.md は親
// ディレクトリの URL に畳み、 sibling foo.md は /<parent>/foo として独立した
// URL を持つ。 .en.md は同一 URL の英語ペアなので別 entry を生まない。
const mdRelPathToUrlPath = (relPath: string): string | null => {
  if (relPath.endsWith(".en.md")) return null
  if (!relPath.endsWith(".md")) return null
  const stripped = relPath
    .replace(/\/index\.md$/, "")
    .replace(/\.md$/, "")
  if (stripped === "" || stripped === "index") return "/"

  return `/${stripped}`
}

// /_dev/* は dev 専用 preview の規約 (app/lib/routes-helpers.ts) で production
// から除外する。 search-index / sitemap-loader / content-tree も同じ判定を共有。
const isExcludedUrlPath = (urlPath: string): boolean =>
  urlPath === "/_dev" || urlPath.startsWith("/_dev/")

export const listContentPaths = async (
  rootDir?: string,
): Promise<readonly string[]> => {
  const root = rootDir ?? path.resolve(process.cwd(), PAGE_CONTENTS_DIR)
  const found = new Set<string>()

  const walk = async (dir: string, prefix: string): Promise<void> => {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        await walk(path.join(dir, entry.name), rel)
        continue
      }
      if (!entry.isFile()) continue
      const urlPath = mdRelPathToUrlPath(rel)
      if (urlPath === null) continue
      if (isExcludedUrlPath(urlPath)) continue
      found.add(urlPath)
    }
  }

  await walk(root, "")

  return Array.from(found).sort()
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
  contentPaths: readonly string[],
): readonly SitemapEntry[] => {
  const base = trimOrigin(origin)
  const paths = [
    ...STATIC_PATHS,
    ...contentPaths,
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

// page-contents/ は build 時に固まる想定なので、 起動後に一度だけ walk して
// 以後は memo する。 変更が要る場合は process を restart する規約。
let cachedContentPaths: readonly string[] | null = null

export const handleSitemap = (env: ServerEnv): RequestHandler =>
  async (_req, res) => {
    if (cachedContentPaths === null) {
      cachedContentPaths = await listContentPaths()
    }
    const entries = buildSitemapEntries(env.DB_PORTAL_PORTAL_ORIGIN, cachedContentPaths)
    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600, s-maxage=86400")
      .send(renderSitemapXml(entries))
  }
