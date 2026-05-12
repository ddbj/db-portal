import type { NewsSourceConfig } from "./sources"
import type { NewsSource } from "./types"

const API_BASE = "https://api.github.com"
const RAW_BASE = "https://raw.githubusercontent.com"

const authHeaders = (): Record<string, string> => {
  const token = process.env.GITHUB_TOKEN
  if (!token) return {}

  return { Authorization: `Bearer ${token}` }
}

interface GitHubTreeEntry {
  path: string
  mode: string
  type: "blob" | "tree" | "commit"
  sha: string
  size?: number
  url: string
}

interface GitHubTreeResponse {
  sha: string
  url: string
  tree: GitHubTreeEntry[]
  truncated: boolean
}

interface ClientCacheEntry {
  refSha: string | null
  treeETag: string | null
}

const clientCache = new Map<NewsSource, ClientCacheEntry>()

const getCacheEntry = (source: NewsSource): ClientCacheEntry => {
  const existing = clientCache.get(source)
  if (existing) return existing
  const next: ClientCacheEntry = { refSha: null, treeETag: null }
  clientCache.set(source, next)

  return next
}

export interface NewsFileEntry {
  path: string
  sha: string
}

export interface FetchTreeResult {
  changed: boolean
  files: NewsFileEntry[]
  refSha: string
}

const fetchBranchSha = async (cfg: NewsSourceConfig): Promise<string> => {
  const url = `${API_BASE}/repos/${cfg.owner}/${cfg.repo}/branches/${cfg.branch}`
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...authHeaders(),
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub branches API ${res.status} (${cfg.source}): ${await res.text()}`)
  }
  const body = (await res.json()) as { commit?: { sha?: string } }
  const sha = body.commit?.sha
  if (!sha) throw new Error(`GitHub branches API (${cfg.source}): missing commit.sha`)

  return sha
}

export const fetchNewsTree = async (cfg: NewsSourceConfig): Promise<FetchTreeResult> => {
  const cache = getCacheEntry(cfg.source)
  const refSha = await fetchBranchSha(cfg)
  if (cache.refSha === refSha && cache.treeETag) {
    return { changed: false, files: [], refSha }
  }
  const url = `${API_BASE}/repos/${cfg.owner}/${cfg.repo}/git/trees/${refSha}?recursive=1`
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...authHeaders(),
  }
  if (cache.treeETag) headers["If-None-Match"] = cache.treeETag
  const res = await fetch(url, { headers })
  if (res.status === 304) {
    cache.refSha = refSha

    return { changed: false, files: [], refSha }
  }
  if (!res.ok) {
    throw new Error(`GitHub git/trees API ${res.status} (${cfg.source}): ${await res.text()}`)
  }
  const etag = res.headers.get("ETag")
  if (etag) cache.treeETag = etag
  const body = (await res.json()) as GitHubTreeResponse
  if (body.truncated) {
    console.warn(`[news-mirror] GitHub git/trees response truncated (${cfg.source})`)
  }
  const files = body.tree
    .filter((e) => e.type === "blob")
    .filter((e) => cfg.filenamePattern.test(e.path))
    .map((e) => ({ path: e.path, sha: e.sha }))
  cache.refSha = refSha

  return { changed: true, files, refSha }
}

export const fetchRawFile = async (cfg: NewsSourceConfig, filePath: string): Promise<string> => {
  const url = `${RAW_BASE}/${cfg.owner}/${cfg.repo}/${cfg.branch}/${filePath}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    throw new Error(`raw fetch ${cfg.source}:${filePath} ${res.status}`)
  }

  return await res.text()
}

export const GLOBAL_YAML_PATH = "_data/global.yml" as const

export const fetchGlobalYaml = async (cfg: NewsSourceConfig): Promise<string> =>
  fetchRawFile(cfg, GLOBAL_YAML_PATH)

export const __resetClientCacheForTest = (): void => {
  clientCache.clear()
}
