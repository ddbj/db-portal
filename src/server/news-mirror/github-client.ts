const OWNER = "ddbj"
const REPO = "www"
const DEFAULT_BRANCH = "main"
const branch = (): string => process.env.NEWS_MIRROR_BRANCH ?? DEFAULT_BRANCH
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

const lastRefSha: { value: string | null } = { value: null }
let treeETag: string | null = null

export interface NewsFileEntry {
  path: string
  sha: string
}

export interface FetchTreeResult {
  changed: boolean
  files: NewsFileEntry[]
  refSha: string
}

const fetchBranchSha = async (): Promise<string> => {
  const url = `${API_BASE}/repos/${OWNER}/${REPO}/branches/${branch()}`
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...authHeaders(),
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub branches API ${res.status}: ${await res.text()}`)
  }
  const body = (await res.json()) as { commit?: { sha?: string } }
  const sha = body.commit?.sha
  if (!sha) throw new Error("GitHub branches API: missing commit.sha")

  return sha
}

export const fetchNewsTree = async (): Promise<FetchTreeResult> => {
  const refSha = await fetchBranchSha()
  if (lastRefSha.value === refSha && treeETag) {
    return { changed: false, files: [], refSha }
  }
  const url = `${API_BASE}/repos/${OWNER}/${REPO}/git/trees/${refSha}?recursive=1`
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...authHeaders(),
  }
  if (treeETag) headers["If-None-Match"] = treeETag
  const res = await fetch(url, { headers })
  if (res.status === 304) {
    lastRefSha.value = refSha

    return { changed: false, files: [], refSha }
  }
  if (!res.ok) {
    throw new Error(`GitHub git/trees API ${res.status}: ${await res.text()}`)
  }
  const etag = res.headers.get("ETag")
  if (etag) treeETag = etag
  const body = (await res.json()) as GitHubTreeResponse
  if (body.truncated) {
    console.warn("[news-mirror] GitHub git/trees response truncated")
  }
  const files = body.tree
    .filter((e) => e.type === "blob")
    .filter((e) => /^_news\/(ja|en)\/[^/]+\.md$/.test(e.path))
    .map((e) => ({ path: e.path, sha: e.sha }))
  lastRefSha.value = refSha

  return { changed: true, files, refSha }
}

export const fetchRawFile = async (filePath: string): Promise<string> => {
  const url = `${RAW_BASE}/${OWNER}/${REPO}/${branch()}/${filePath}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    throw new Error(`raw fetch ${filePath} ${res.status}`)
  }

  return await res.text()
}

export const GLOBAL_YAML_PATH = "_data/global.yml" as const

export const fetchGlobalYaml = async (): Promise<string> => fetchRawFile(GLOBAL_YAML_PATH)

export const __resetClientCacheForTest = (): void => {
  lastRefSha.value = null
  treeETag = null
}
