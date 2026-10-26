import fs from "node:fs/promises"
import path from "node:path"

import type { RequestHandler } from "express"
import { z } from "zod"

import { PageLastUpdated } from "../../app/schemas/content/page-content"
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

// build の前段の gen:last-updated が書く記録。Markdown ページの言語別の最終
// 更新日時を <lastmod> に使う。
const LAST_UPDATED_FILE = "app/lib/content/gen/last-updated.json"

// app/lib/content/markdown-loader.ts の extractUrlPath と同じ規約で URL にする。
// index.md は親ディレクトリの URL になり、同じディレクトリの foo.md は
// /<parent>/foo になる。.en.md は同じ URL の英語版なので entry を増やさない。
const mdRelPathToUrlPath = (relPath: string): string | null => {
  if (relPath.endsWith(".en.md")) return null
  if (!relPath.endsWith(".md")) return null
  const stripped = relPath
    .replace(/\/index\.md$/, "")
    .replace(/\.md$/, "")
  if (stripped === "" || stripped === "index") return "/"

  return `/${stripped}`
}

// /_dev/* は dev 専用の preview (app/lib/routes-helpers.ts) なので production
// に含めない。search-index / sitemap-loader / content-tree も同じ判定を使う。
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

const LastUpdatedMap = z.record(z.string(), PageLastUpdated)
export type LastUpdatedMap = z.infer<typeof LastUpdatedMap>

// 記録が無いときと読めないときは空にする。lastmod は任意の要素なので、記録が
// 無くても sitemap は出す。
export const readLastUpdated = async (filePath?: string): Promise<LastUpdatedMap> => {
  const file = filePath ?? path.resolve(process.cwd(), LAST_UPDATED_FILE)
  let parsed: unknown
  try {
    parsed = JSON.parse(await fs.readFile(file, "utf-8"))
  } catch {
    return {}
  }
  const result = LastUpdatedMap.safeParse(parsed)

  return result.success ? result.data : {}
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
  // W3C Datetime。無いページは要素ごと出さない。
  lastmod?: string
  alternates: readonly SitemapAlternate[]
}

const withLastmod = (entry: SitemapEntry, lastmod: string | undefined): SitemapEntry =>
  lastmod === undefined ? entry : { ...entry, lastmod }

export const buildSitemapEntries = (
  origin: string,
  contentPaths: readonly string[],
  lastUpdated: LastUpdatedMap = {},
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
    const updated = lastUpdated[normalized]

    return [
      withLastmod({ loc: jaUrl, alternates }, updated?.ja),
      withLastmod({ loc: enUrl, alternates }, updated?.en),
    ]
  })
}

export const renderSitemapXml = (entries: readonly SitemapEntry[]): string => {
  const body = entries
    .map((entry) =>
      [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        ...(entry.lastmod === undefined ? [] : [`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`]),
        ...entry.alternates.map(
          (a) =>
            `    <xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}"/>`,
        ),
        "  </url>",
      ].join("\n"),
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`
}

// page-contents/ と last-updated.json は build 時に決まるので、最初のリクエスト
// で一度だけ読み、以後はその値を使う。変えるときは process を再起動する。
let cachedContentPaths: readonly string[] | null = null
let cachedLastUpdated: LastUpdatedMap | null = null

export const handleSitemap = (env: ServerEnv): RequestHandler =>
  async (_req, res) => {
    // 検索エンジンに載せない配置には、並べるページが無い。
    if (env.DB_PORTAL_ENV !== "production") {
      res.status(404).type("text/plain").send("Not Found")

      return
    }
    cachedContentPaths ??= await listContentPaths()
    cachedLastUpdated ??= await readLastUpdated()
    const entries = buildSitemapEntries(env.DB_PORTAL_PORTAL_ORIGIN, cachedContentPaths, cachedLastUpdated)
    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600, s-maxage=86400")
      .send(renderSitemapXml(entries))
  }
