import { execFileSync } from "node:child_process"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import { NewsCache, type NewsList, type NewsSource } from "../app/schemas/api-bff/news"
import { type LangRawMap, pairToNewsItems, parseRawArticle } from "../server/news/pair"
import { dbclsConfig, ddbjConfig, type GitHubSourceConfig } from "../server/news/sources"

type SourceArgs = {
  source: NewsSource
  dir: string
  sha: string | null
}

type CliArgs = {
  outFile: string
  sources: SourceArgs[]
}

const usage = (): never => {
  console.error(
    "usage: seed-news-cache.ts --out <cache.json> [--ddbj-source <dir>] [--ddbj-sha <sha>] [--dbcls-source <dir>] [--dbcls-sha <sha>]",
  )
  process.exit(1)
}

const parseArgs = (argv: readonly string[]): CliArgs => {
  let outFile: string | undefined
  let ddbjDir: string | undefined
  let ddbjSha: string | null = null
  let dbclsDir: string | undefined
  let dbclsSha: string | null = null
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
      case "--ddbj-sha":
        ddbjSha = v
        i++
        break
      case "--dbcls-source":
        dbclsDir = v
        i++
        break
      case "--dbcls-sha":
        dbclsSha = v
        i++
        break
      default:
        console.error(`unknown arg: ${key}`)
        usage()
    }
  }
  if (!outFile) usage()
  const sources: SourceArgs[] = []
  if (ddbjDir) sources.push({ source: "ddbj", dir: ddbjDir, sha: ddbjSha })
  if (dbclsDir) sources.push({ source: "dbcls", dir: dbclsDir, sha: dbclsSha })
  if (sources.length === 0) {
    console.error("at least one of --ddbj-source or --dbcls-source is required")
    process.exit(1)
  }

  return { outFile: outFile!, sources }
}

const sourceConfig = (source: NewsSource): GitHubSourceConfig =>
  source === "ddbj" ? ddbjConfig("ddbj/www", "main") : dbclsConfig("dbcls/website", "master")

const collectFromDir = async (
  cfg: GitHubSourceConfig,
  dir: string,
  lang: "ja" | "en",
): Promise<LangRawMap> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const map: LangRawMap = new Map()
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const filePath = path.join(dir, entry.name)
    const raw = await readFile(filePath, "utf8")
    const parsed = parseRawArticle(cfg.source, lang, entry.name, raw, cfg.slugFromFilename)
    if (parsed) map.set(parsed.slug, parsed)
  }

  return map
}

const resolveSha = (cwd: string, repoPath: string): string | null => {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%H", "--", repoPath], {
      cwd,
      encoding: "utf8",
    })

    return out.trim() || null
  } catch {
    return null
  }
}

const collectForSource = async (
  arg: SourceArgs,
): Promise<{ items: NewsList; sha: { ja: string | null; en: string | null } }> => {
  const cfg = sourceConfig(arg.source)
  const jaDir = path.join(arg.dir, cfg.pathByLang.ja)
  const enDir = path.join(arg.dir, cfg.pathByLang.en)
  const [ja, en] = await Promise.all([
    collectFromDir(cfg, jaDir, "ja"),
    collectFromDir(cfg, enDir, "en"),
  ])
  const items = pairToNewsItems(cfg, ja, en) as NewsList
  const sha = arg.sha
    ?? resolveSha(arg.dir, cfg.pathByLang.ja)
    ?? null

  return { items, sha: { ja: sha, en: sha } }
}

const run = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))
  const items: NewsList = []
  const lastCommitSha: Record<string, { ja: string | null; en: string | null }> = {}
  for (const sourceArg of args.sources) {
    const { items: srcItems, sha } = await collectForSource(sourceArg)
    items.push(...srcItems)
    lastCommitSha[sourceArg.source] = sha
    console.log(
      `  ${sourceArg.source}: ${srcItems.length} items (sha=${sha.ja ?? "null"})`,
    )
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const cache = NewsCache.parse({
    schemaVersion: 2,
    lastCommitSha,
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
