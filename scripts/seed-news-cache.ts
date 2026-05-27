import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { promisify } from "node:util"

import { NewsCache, type NewsList, type NewsSource } from "../app/schemas/api-bff/news"
import { isFeaturedSlug, loadFeaturedWhitelist } from "../server/news/featured"
import { type LangRawMap, pairToNewsItems, parseRawArticle } from "../server/news/pair"
import { dbclsConfig, ddbjConfig, type RepoSourceConfig } from "../server/news/sources"

const execFileAsync = promisify(execFile)

type SourceArg = {
  source: NewsSource
  dir: string
}

type CliArgs = {
  outFile: string
  sources: SourceArg[]
}

const usage = (): never => {
  console.error(
    "usage: seed-news-cache.ts --out <cache.json> [--ddbj-source <dir>] [--dbcls-source <dir>]",
  )
  process.exit(1)
}

const parseArgs = (argv: readonly string[]): CliArgs => {
  let outFile: string | undefined
  let ddbjDir: string | undefined
  let dbclsDir: string | undefined
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    const value = argv[i + 1]
    if (value === undefined) usage()
    const v = value as string
    switch (key) {
      case "--out":
        outFile = v
        i++
        break
      case "--ddbj-source":
        ddbjDir = v
        i++
        break
      case "--dbcls-source":
        dbclsDir = v
        i++
        break
      default:
        console.error(`unknown arg: ${key}`)
        usage()
    }
  }
  if (outFile === undefined) return usage()
  const sources: SourceArg[] = []
  if (ddbjDir) sources.push({ source: "ddbj", dir: ddbjDir })
  if (dbclsDir) sources.push({ source: "dbcls", dir: dbclsDir })
  if (sources.length === 0) {
    console.error("at least one of --ddbj-source or --dbcls-source is required")
    process.exit(1)
  }

  return { outFile, sources }
}

const buildConfig = (source: NewsSource, dir: string): RepoSourceConfig =>
  source === "ddbj"
    ? ddbjConfig("https://github.com/ddbj/www.git", "main", dir)
    : dbclsConfig("https://github.com/dbcls/website.git", "master", dir)

const collectFromDir = async (
  cfg: RepoSourceConfig,
  lang: "ja" | "en",
): Promise<LangRawMap> => {
  const dir = cfg.pathByLang[lang]
  const entries = await readdir(dir, { withFileTypes: true })
  const map: LangRawMap = new Map()
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const raw = await readFile(path.join(dir, entry.name), "utf8")
    const parsed = parseRawArticle(cfg.source, lang, entry.name, raw, cfg.slugFromFilename)
    if (parsed) map.set(parsed.slug, parsed)
  }

  return map
}

const resolveHeadSha = async (cwd: string): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd })

    return stdout.trim() || null
  } catch {
    return null
  }
}

const consoleLogger = {
  debug: () => undefined,
  info: (msg: string, ctx?: unknown) => console.log(`info ${msg}`, ctx ?? ""),
  warn: (msg: string, ctx?: unknown) => console.warn(`warn ${msg}`, ctx ?? ""),
  error: (msg: string, ctx?: unknown) => console.error(`error ${msg}`, ctx ?? ""),
}

const collectForSource = async (
  arg: SourceArg,
  whitelistPath: string | undefined,
): Promise<{ items: NewsList; sha: string | null }> => {
  const cfg = buildConfig(arg.source, arg.dir)
  const [ja, en, sha] = await Promise.all([
    collectFromDir(cfg, "ja"),
    collectFromDir(cfg, "en"),
    resolveHeadSha(arg.dir),
  ])
  const whitelist = whitelistPath
    ? await loadFeaturedWhitelist(whitelistPath, consoleLogger)
    : { ja: new Set<string>(), en: new Set<string>() }
  const items = pairToNewsItems(cfg, ja, en, (slug) =>
    isFeaturedSlug(cfg.source, slug, whitelist)) as NewsList

  return { items, sha }
}

const run = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))
  const items: NewsList = []
  const lastSyncSha: Record<string, string | null> = {}
  const ddbjArg = args.sources.find((s) => s.source === "ddbj")
  const whitelistPath = ddbjArg
    ? path.join(ddbjArg.dir, "_data/global.yml")
    : undefined
  for (const sourceArg of args.sources) {
    const wlPath = sourceArg.source === "ddbj" ? whitelistPath : undefined
    const { items: srcItems, sha } = await collectForSource(sourceArg, wlPath)
    items.push(...srcItems)
    lastSyncSha[sourceArg.source] = sha
    const featuredCount = srcItems.filter((i) => i.featured).length
    console.log(
      `  ${sourceArg.source}: ${srcItems.length} items (featured=${featuredCount}, sha=${sha ?? "null"})`,
    )
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const cache = NewsCache.parse({
    schemaVersion: 3,
    lastSyncSha,
    lastFetchedAt: new Date().toISOString(),
    items,
  })
  await mkdir(path.dirname(args.outFile), { recursive: true })
  await writeFile(args.outFile, JSON.stringify(cache, null, 2), "utf8")
  console.log(`wrote ${items.length} items to ${args.outFile}`)
}

run().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
